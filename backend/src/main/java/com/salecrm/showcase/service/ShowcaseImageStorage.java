package com.salecrm.showcase.service;

import com.salecrm.common.exception.BusinessException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@SuppressWarnings("null")
public class ShowcaseImageStorage {

    public static final int IMAGE_SIZE = 1200;
    /** Grid / list cards — much smaller payloads than full 1200px. */
    public static final int THUMB_SIZE = 480;
    private static final Color CANVAS_BG = new Color(0xf2, 0xf2, 0xf7);
    private static final float JPEG_QUALITY = 0.88f;
    private static final float THUMB_JPEG_QUALITY = 0.82f;
    private static final Set<String> ALLOWED = Set.of(
            "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif");
    private static final long MAX_BYTES = 8L * 1024 * 1024;

    @Value("${app.showcase.image-dir:./data/showcase}")
    private String imageDir;

    public String store(Long itemId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BusinessException("Image too large (max 8MB)", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType() != null
                ? file.getContentType().toLowerCase(Locale.ROOT)
                : "";
        if (!ALLOWED.contains(contentType)) {
            throw new BusinessException("Only JPEG, PNG, WebP, or GIF images are allowed");
        }

        String filename = "img-" + UUID.randomUUID().toString().substring(0, 8) + ".jpg";
        try {
            Path dir = Path.of(imageDir, String.valueOf(itemId)).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            Path target = dir.resolve(filename).normalize();
            if (!target.startsWith(dir)) {
                throw new BusinessException("Invalid image path");
            }

            BufferedImage source;
            try (InputStream in = file.getInputStream()) {
                source = ImageIO.read(in);
            }
            if (source != null) {
                BufferedImage full = toSquare(source, IMAGE_SIZE);
                writeJpeg(full, target, JPEG_QUALITY);
                writeJpeg(toSquare(source, THUMB_SIZE), thumbPathBeside(target), THUMB_JPEG_QUALITY);
            } else {
                String ext = extensionFor(contentType, file.getOriginalFilename());
                filename = "img-" + UUID.randomUUID().toString().substring(0, 8) + ext;
                target = dir.resolve(filename).normalize();
                try (InputStream in = file.getInputStream()) {
                    Files.copy(in, target);
                }
            }
            return itemId + "/" + filename;
        } catch (BusinessException ex) {
            throw ex;
        } catch (IOException ex) {
            log.error("Failed to store showcase image", ex);
            throw new BusinessException("Failed to store image", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    public Path resolve(String relativePath) {
        return resolve(relativePath, false);
    }

    public Path resolve(String relativePath, boolean thumb) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        Path root = Path.of(imageDir).toAbsolutePath().normalize();
        Path full = root.resolve(relativePath).normalize();
        if (!full.startsWith(root) || !Files.isRegularFile(full)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        if (!thumb) {
            return full;
        }
        Path thumbPath = thumbPathBeside(full);
        if (Files.isRegularFile(thumbPath)) {
            return thumbPath;
        }
        try {
            ensureThumb(full, thumbPath);
            if (Files.isRegularFile(thumbPath)) {
                return thumbPath;
            }
        } catch (Exception ex) {
            log.warn("Thumb generate failed for {}: {}", relativePath, ex.toString());
        }
        return full;
    }

    public void deleteQuietly(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        try {
            Path full = resolve(relativePath, false);
            Files.deleteIfExists(full);
            Files.deleteIfExists(thumbPathBeside(full));
        } catch (Exception ignored) {
            // best-effort
        }
    }

    /** Backfill missing .thumb.jpg beside an existing full image. */
    public boolean ensureThumbForRelative(String relativePath) {
        try {
            Path full = resolve(relativePath, false);
            return ensureThumbBeside(full);
        } catch (Exception ex) {
            log.warn("Thumb backfill failed for {}: {}", relativePath, ex.toString());
            return false;
        }
    }

    /**
     * Walk the showcase image tree and create missing {@code *.thumb.jpg} files.
     * Safe to re-run; skips files that already have thumbs.
     */
    public ThumbBackfillStats backfillMissingThumbs() {
        Path root = Path.of(imageDir).toAbsolutePath().normalize();
        int scanned = 0;
        int created = 0;
        int skipped = 0;
        int failed = 0;
        if (!Files.isDirectory(root)) {
            return new ThumbBackfillStats(0, 0, 0, 0);
        }
        try (var walk = Files.walk(root)) {
            List<Path> fulls = walk
                    .filter(Files::isRegularFile)
                    .filter(p -> {
                        String n = p.getFileName().toString().toLowerCase(Locale.ROOT);
                        return (n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png")
                                || n.endsWith(".webp") || n.endsWith(".gif"))
                                && !n.endsWith(".thumb.jpg");
                    })
                    .toList();
            for (Path full : fulls) {
                scanned++;
                Path thumb = thumbPathBeside(full);
                if (Files.isRegularFile(thumb)) {
                    skipped++;
                    continue;
                }
                try {
                    if (ensureThumbBeside(full)) {
                        created++;
                    } else {
                        failed++;
                    }
                } catch (Exception ex) {
                    failed++;
                    log.warn("Thumb backfill failed for {}: {}", full, ex.toString());
                }
                if (scanned % 200 == 0) {
                    log.info("Showcase thumb backfill progress: scanned={} created={} skipped={} failed={}",
                            scanned, created, skipped, failed);
                }
            }
        } catch (IOException ex) {
            log.error("Showcase thumb backfill walk failed", ex);
        }
        log.info("Showcase thumb backfill done: scanned={} created={} skipped={} failed={}",
                scanned, created, skipped, failed);
        return new ThumbBackfillStats(scanned, created, skipped, failed);
    }

    public record ThumbBackfillStats(int scanned, int created, int skipped, int failed) {}

    private boolean ensureThumbBeside(Path full) throws IOException {
        Path thumb = thumbPathBeside(full);
        if (Files.isRegularFile(thumb)) return false;
        ensureThumb(full, thumb);
        return Files.isRegularFile(thumb);
    }

    private static void ensureThumb(Path full, Path thumb) throws IOException {
        BufferedImage source;
        try (InputStream in = Files.newInputStream(full)) {
            source = ImageIO.read(in);
        }
        if (source == null) return;
        writeJpeg(toSquare(source, THUMB_SIZE), thumb, THUMB_JPEG_QUALITY);
    }

    static Path thumbPathBeside(Path full) {
        String name = full.getFileName().toString();
        int dot = name.lastIndexOf('.');
        String thumbName = (dot > 0 ? name.substring(0, dot) : name) + ".thumb.jpg";
        return full.resolveSibling(thumbName);
    }

    static BufferedImage toSquare(BufferedImage source) {
        return toSquare(source, IMAGE_SIZE);
    }

    static BufferedImage toSquare(BufferedImage source, int size) {
        BufferedImage canvas = new BufferedImage(size, size, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = canvas.createGraphics();
        try {
            g.setColor(CANVAS_BG);
            g.fillRect(0, 0, size, size);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            double scale = Math.min((double) size / source.getWidth(), (double) size / source.getHeight());
            int w = Math.max(1, (int) Math.round(source.getWidth() * scale));
            int h = Math.max(1, (int) Math.round(source.getHeight() * scale));
            g.drawImage(source, (size - w) / 2, (size - h) / 2, w, h, null);
        } finally {
            g.dispose();
        }
        return canvas;
    }

    private static void writeJpeg(BufferedImage image, Path target, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IOException("No JPEG writer");
        }
        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        if (param.canWriteCompressed()) {
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(quality);
        }
        try (OutputStream out = Files.newOutputStream(target);
             ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    private static String extensionFor(String contentType, String original) {
        if (contentType.contains("png")) return ".png";
        if (contentType.contains("webp")) return ".webp";
        if (contentType.contains("gif")) return ".gif";
        if (original != null && original.contains(".")) {
            return original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
        return ".bin";
    }
}
