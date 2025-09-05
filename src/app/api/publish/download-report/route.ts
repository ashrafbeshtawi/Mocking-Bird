import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_STRING,
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) {
      console.error('[DownloadReport API Error] User ID not found in headers.');
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
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

      // Generate HTML for the PDF
      // For now, return the report as plain text since Puppeteer was denied.
      // Generating a PDF from HTML typically requires a rendering engine,
      // and without Puppeteer, an alternative library would be needed.
      const reportText = `
Publish Report - History ID: ${historyId}
Published At: ${new Date(created_at).toLocaleString()}
Status: ${publish_status.replace('_', ' ')}

Content:
${content}

Publish Log:
${publish_report}
      `.trim();

      return new NextResponse(reportText, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="publish_report_${historyId}.txt"`,
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
