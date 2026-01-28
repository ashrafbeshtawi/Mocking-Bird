import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getAuthUserId } from '@/lib/api-auth';


export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      console.error('[DownloadReport API Error] User ID not found in session.');
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const historyId = searchParams.get('id');

    if (!historyId) {
      return NextResponse.json({ error: 'Publish history ID is required.' }, { status: 400 });
    }

    const parsedUserId = parseInt(userId, 10);
    const parsedHistoryId = parseInt(historyId, 10);

    if (isNaN(parsedUserId) || isNaN(parsedHistoryId)) {
      return NextResponse.json({ error: 'Invalid ID format.' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(
        'SELECT content, publish_report, publish_status, created_at FROM publish_history WHERE id = $1 AND user_id = $2',
        [parsedHistoryId, parsedUserId]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: 'Publish history entry not found.' }, { status: 404 });
      }

      const { content, publish_report, publish_status, created_at } = rows[0];

      const formattedStatus = publish_status.replace(/_/g, ' ').split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      const formattedDate = new Date(created_at).toLocaleString();

      const htmlContent = `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Publish Report - History ID: ${historyId}</title>
                                <style>
                                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 20px; background-color: #f4f4f4; }
                                    .container { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); max-width: 800px; margin: auto; }
                                    h1 { color: #0056b3; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
                                    h2 { color: #0056b3; margin-top: 25px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
                                    p { margin-bottom: 10px; }
                                    strong { color: #555; }
                                    pre { background: #eef; padding: 15px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
                                    .status-success { color: green; font-weight: bold; }
                                    .status-failed { color: red; font-weight: bold; }
                                    .status-pending { color: orange; font-weight: bold; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>Publish Report - History ID: ${historyId}</h1>
                                    <p><strong>Published At:</strong> ${formattedDate}</p>
                                    <p><strong>Status:</strong> <span class="status-${publish_status.toLowerCase()}">${formattedStatus}</span></p>

                                    <h2>Content:</h2>
                                    <pre>${content}</pre>

                                    <h2>Publish Log:</h2>
                                    <pre>${publish_report}</pre>
                                </div>
                            </body>
                            </html> 
      `.trim();

      return new NextResponse(htmlContent, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="publish_report_${historyId}.html"`,
        },
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('[DownloadReport API Error]', error);
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
