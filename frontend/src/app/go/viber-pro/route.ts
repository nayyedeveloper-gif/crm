import { NextResponse } from 'next/server';

/** Opens Viber chat with Customer Service Pro Team (09753430161). */
const VIBER_DEEP_LINK = 'viber://chat?number=%2B959753430161';

export function GET() {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="my">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${VIBER_DEEP_LINK}" />
  <title>Pro Team Viber</title>
  <script>location.replace(${JSON.stringify(VIBER_DEEP_LINK)});</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center">
  <p>Viber သို့ ဖွင့်နေပါသည်…</p>
  <p><a href="${VIBER_DEEP_LINK}">Pro Team (Viber) 09753430161</a></p>
</body>
</html>`,
    {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    }
  );
}
