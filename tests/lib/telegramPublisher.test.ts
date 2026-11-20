import type { Pool } from 'pg';
import { TelegramPublisher, escapeHtml, type TelegramChannelToken } from '@/lib/publishers/telegram';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';

const channel: TelegramChannelToken = { channel_id: '-100123', channel_title: 'News' };

const image = (n: number): CloudinaryMediaInfo => ({
  publicId: `img${n}`,
  publicUrl: `https://res.cloudinary.com/img${n}.jpg`,
  resourceType: 'image',
  format: 'jpg',
  originalFilename: `img${n}.jpg`,
});

const ok = (result: unknown) =>
  new Response(JSON.stringify({ ok: true, result }), { status: 200, headers: { 'Content-Type': 'application/json' } });

const message = (id: number) => ({ message_id: id, chat: { id: -100123 } });

describe('escapeHtml', () => {
  it('escapes &, < and >', () => {
    expect(escapeHtml('Q&A: I <3 a>b')).toBe('Q&amp;A: I &lt;3 a&gt;b');
  });

  it('escapes text that looks like tags so it is shown literally', () => {
    expect(escapeHtml('<b>hi</b> &amp;')).toBe('&lt;b&gt;hi&lt;/b&gt; &amp;amp;');
  });
});

describe('TelegramPublisher', () => {
  let publisher: TelegramPublisher;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';
    publisher = new TelegramPublisher({} as Pool);
    fetchMock = jest.spyOn(global, 'fetch');
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  const calls = () =>
    fetchMock.mock.calls.map(([url, init]) => ({
      method: String(url).split('/').pop(),
      body: JSON.parse(init.body),
    }));

  it('escapes <, > and & in a text-only message', async () => {
    fetchMock.mockResolvedValueOnce(ok(message(1)));

    const { successful, failed } = await publisher.publishToChannels({ text: 'I <3 Q&A > all' }, [channel]);

    expect(failed).toEqual([]);
    expect(successful).toEqual([
      { platform: 'telegram', channel_id: '-100123', channel_title: 'News', message_id: 1, chat_id: '-100123' },
    ]);
    expect(calls()).toEqual([
      { method: 'sendMessage', body: { chat_id: '-100123', text: 'I &lt;3 Q&amp;A &gt; all', parse_mode: 'HTML' } },
    ]);
  });

  it('escapes the caption of a single photo', async () => {
    fetchMock.mockResolvedValueOnce(ok(message(2)));

    await publisher.publishToChannels({ text: 'a<b & c', cloudinaryMedia: [image(1)] }, [channel]);

    expect(calls()).toEqual([
      {
        method: 'sendPhoto',
        body: { chat_id: '-100123', photo: image(1).publicUrl, caption: 'a&lt;b &amp; c', parse_mode: 'HTML' },
      },
    ]);
  });

  it('escapes the caption of a media group', async () => {
    fetchMock.mockResolvedValueOnce(ok([message(3), message(4)]));

    const { successful } = await publisher.publishToChannels(
      { text: 'I <3 this', cloudinaryMedia: [image(1), image(2)] },
      [channel]
    );

    expect(successful[0].message_id).toBe(3);
    expect(successful[0].warning).toBeUndefined();
    const [call] = calls();
    expect(call.method).toBe('sendMediaGroup');
    expect(call.body.media[0]).toMatchObject({ caption: 'I &lt;3 this', parse_mode: 'HTML' });
    expect(call.body.media[1].caption).toBeUndefined();
  });

  it('sends a caption over 1024 characters as a separate text message after the media', async () => {
    const longText = `<3 & ${'x'.repeat(1100)}`;
    fetchMock.mockResolvedValueOnce(ok(message(5))).mockResolvedValueOnce(ok(message(6)));

    const { successful, failed } = await publisher.publishToChannels(
      { text: longText, cloudinaryMedia: [image(1)] },
      [channel]
    );

    expect(failed).toEqual([]);
    expect(successful[0].message_id).toBe(5);
    const [photo, text] = calls();
    expect(photo.method).toBe('sendPhoto');
    expect(photo.body.caption).toBeUndefined();
    expect(photo.body.parse_mode).toBeUndefined();
    expect(text).toEqual({
      method: 'sendMessage',
      body: { chat_id: '-100123', text: escapeHtml(longText), parse_mode: 'HTML' },
    });
  });

  it('keeps a caption of exactly 1024 characters on the media', async () => {
    fetchMock.mockResolvedValueOnce(ok(message(7)));

    await publisher.publishToChannels({ text: 'y'.repeat(1024), cloudinaryMedia: [image(1)] }, [channel]);

    expect(calls()).toHaveLength(1);
    expect(calls()[0].body.caption).toHaveLength(1024);
  });

  it('reports a warning when the long text cannot be sent after the media', async () => {
    fetchMock
      .mockResolvedValueOnce(ok([message(8), message(9)]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: false, description: 'Bad Request: chat not found' }), { status: 400 })
      );

    const { successful, failed } = await publisher.publishToChannels(
      { text: 'z'.repeat(2000), cloudinaryMedia: [image(1), image(2)] },
      [channel]
    );

    expect(failed).toEqual([]);
    expect(successful[0].warning).toBe(
      'The media was posted, but the text (too long for a caption) could not be sent: Bad Request: chat not found'
    );
  });

  it('posts the first 10 media and reports the rest as a warning', async () => {
    const media = Array.from({ length: 12 }, (_, i) => image(i));
    fetchMock.mockResolvedValueOnce(ok([message(10)]));

    const { successful } = await publisher.publishToChannels({ text: 'hi', cloudinaryMedia: media }, [channel]);

    expect(calls()[0].body.media).toHaveLength(10);
    expect(successful[0].warning).toBe('Telegram allows at most 10 media per post, so 2 of 12 were not posted.');
  });

  it('reports Telegram errors as a failed channel', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, description: "Bad Request: can't parse entities" }), { status: 400 })
    );

    const { successful, failed } = await publisher.publishToChannels({ text: 'hi' }, [channel]);

    expect(successful).toEqual([]);
    expect(failed[0].error.message).toBe("Bad Request: can't parse entities");
  });
});
