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
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
@SuppressWarnings("null")
public class ShowcaseImageStorage {

    public static final int IMAGE_SIZE = 1200;
    private static final Color CANVAS_BG = new Color(0xf2, 0xf2, 0xf7);
    private static final float JPEG_QUALITY = 0.88f;
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
                writeJpeg(toSquare(source), target);
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
        if (relativePath == null || relativePath.isBlank()) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        Path root = Path.of(imageDir).toAbsolutePath().normalize();
        Path path = root.resolve(relativePath).normalize();
        if (!path.startsWith(root) || !Files.isRegularFile(path)) {
            throw new BusinessException("Image not found", HttpStatus.NOT_FOUND);
        }
        return path;
    }

    public void deleteQuietly(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) return;
        try {
            Files.deleteIfExists(resolve(relativePath));
        } catch (Exception ignored) {
            // best-effort
        }
    }

    static BufferedImage toSquare(BufferedImage source) {
        int size = IMAGE_SIZE;
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

    private static void writeJpeg(BufferedImage image, Path target) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpg");
        if (!writers.hasNext()) {
            throw new IOException("No JPEG writer");
        }
        ImageWriter writer = writers.next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        if (param.canWriteCompressed()) {
            param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            param.setCompressionQuality(JPEG_QUALITY);
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
