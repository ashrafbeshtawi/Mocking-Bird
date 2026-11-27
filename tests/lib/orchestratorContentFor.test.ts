import { contentFor } from '@/lib/publish/orchestrator';
import type { CloudinaryMediaInfo } from '@/lib/publish/types';
import type { MediaFile } from '@/types/interfaces';

const media = (publicId: string, resourceType: 'image' | 'video'): CloudinaryMediaInfo => ({
  publicId,
  publicUrl: `https://res.cloudinary.com/${publicId}`,
  resourceType,
  format: resourceType === 'video' ? 'mp4' : 'jpg',
  originalFilename: publicId,
});
const file = (publicId: string, mimetype: string): MediaFile => ({
  buffer: Buffer.from(publicId),
  filename: publicId,
  mimetype,
  publicId,
});

const post = {
  text: 'hello',
  cloudinaryMedia: [media('v1', 'video'), media('v2', 'video'), media('i1', 'image')],
  mediaFiles: [file('v1', 'video/mp4'), file('v2', 'video/mp4'), file('i1', 'image/jpeg')],
};

describe('contentFor', () => {
  it('sends the whole post without selections', () => {
    const sent = contentFor('facebook', post);

    expect(sent.text).toBe('hello');
    expect(sent.cloudinaryMedia).toHaveLength(3);
    expect(sent.mediaFiles).toHaveLength(3);
  });

  it('trims the media to the picked items', () => {
    const sent = contentFor('youtube', { ...post, mediaSelection: { youtube: ['v2'] } });

    expect(sent.cloudinaryMedia.map((m) => m.publicId)).toEqual(['v2']);
    expect(sent.mediaFiles.map((f) => f.publicId)).toEqual(['v2']);
    expect(sent.text).toBe('hello');
  });

  it('applies the kind selection after the media pick', () => {
    const sent = contentFor('twitter', {
      ...post,
      mediaSelection: { twitter: ['v1', 'i1'] },
      contentSelection: { twitter: ['text', 'video'] },
    });

    expect(sent.cloudinaryMedia.map((m) => m.publicId)).toEqual(['v1']);
    expect(sent.mediaFiles.map((f) => f.publicId)).toEqual(['v1']);
  });

  it('leaves other platforms untouched by a pick', () => {
    const sent = contentFor('telegram', { ...post, mediaSelection: { youtube: ['v2'] } });

    expect(sent.cloudinaryMedia).toHaveLength(3);
  });
});
