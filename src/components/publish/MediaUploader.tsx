'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Button, CircularProgress, LinearProgress, Tooltip, Typography, Alert } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import HideImageIcon from '@mui/icons-material/HideImage';
import { MediaPreviewDialog } from '@/components/publish/MediaPreviewDialog';
import {
  uploadToCloudinaryClient,
  getCloudinaryClientConfig,
} from '@/lib/cloudinary/clientUpload';
import type { MediaThumbnail } from '@/lib/publish/types';

// JPEG is the one format every platform's cover accepts; 2 MB is YouTube's thumbnail limit.
const THUMBNAIL_TYPE = 'image/jpeg';
const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

export interface UploadedMedia {
  publicId: string;
  publicUrl: string;
  resourceType: 'image' | 'video';
  format: string;
  width?: number;
  height?: number;
  originalFilename: string;
  // For preview
  previewUrl: string;
  /** Videos only: the custom thumbnail sent to platforms that support one. */
  thumbnail?: MediaThumbnail;
}

interface MediaUploaderProps {
  uploadedMedia: UploadedMedia[];
  onMediaChange: (media: UploadedMedia[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function MediaUploader({ uploadedMedia, onMediaChange, onUploadingChange }: MediaUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<UploadedMedia | null>(null);
  /** publicId of the video whose thumbnail is uploading. */
  const [thumbnailUploadingFor, setThumbnailUploadingFor] = useState<string | null>(null);

  // null = config still loading; only a definite "not configured" hides the uploader
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    getCloudinaryClientConfig()
      .then((config) => setIsConfigured(Boolean(config.cloudName && config.uploadPreset)))
      .catch(() => setIsConfigured(false));
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;

      setUploadError(null);

      const newFiles = Array.from(e.target.files).filter(
        (file) =>
          !uploadedMedia.some(
            (m) => m.originalFilename === file.name
          )
      );

      if (newFiles.length === 0) {
        e.target.value = '';
        return;
      }

      // Initialize uploading state for each file
      const initialUploading: UploadingFile[] = newFiles.map((file) => ({
        file,
        progress: 0,
      }));
      setUploadingFiles((prev) => [...prev, ...initialUploading]);

      // Upload each file
      const uploadPromises = newFiles.map(async (file) => {
        try {
          const result = await uploadToCloudinaryClient(file, (progress) => {
            setUploadingFiles((prev) =>
              prev.map((uf) =>
                uf.file.name === file.name ? { ...uf, progress } : uf
              )
            );
          });

          // Create preview URL
          const previewUrl = URL.createObjectURL(file);

          const uploadedItem: UploadedMedia = {
            publicId: result.publicId,
            publicUrl: result.publicUrl,
            resourceType: result.resourceType,
            format: result.format,
            width: result.width,
            height: result.height,
            originalFilename: result.originalFilename,
            previewUrl,
          };

          return { success: true as const, data: uploadedItem };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Upload failed';
          setUploadingFiles((prev) =>
            prev.map((uf) =>
              uf.file.name === file.name ? { ...uf, error: errorMsg } : uf
            )
          );
          return { success: false as const, error: errorMsg, filename: file.name };
        }
      });

      const results = await Promise.all(uploadPromises);

      // Collect successful uploads
      const successfulUploads = results
        .filter((r): r is { success: true; data: UploadedMedia } => r.success)
        .map((r) => r.data);

      // Collect failed uploads for error message
      const failedUploads = results.filter(
        (r): r is { success: false; error: string; filename: string } => !r.success
      );

      if (failedUploads.length > 0) {
        setUploadError(
          `Failed to upload: ${failedUploads.map((f) => f.filename).join(', ')}`
        );
      }

      // Update parent with new uploaded media
      if (successfulUploads.length > 0) {
        onMediaChange([...uploadedMedia, ...successfulUploads]);
      }

      // Clear completed uploads from uploading state
      setUploadingFiles((prev) =>
        prev.filter(
          (uf) =>
            !successfulUploads.some((s) => s.originalFilename === uf.file.name) &&
            !failedUploads.some((f) => f.filename === uf.file.name)
        )
      );

      // Reset input
      e.target.value = '';
    },
    [uploadedMedia, onMediaChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const mediaToRemove = uploadedMedia[index];
      // Revoke preview URL to free memory
      if (mediaToRemove.previewUrl) {
        URL.revokeObjectURL(mediaToRemove.previewUrl);
      }
      onMediaChange(uploadedMedia.filter((_, i) => i !== index));
    },
    [uploadedMedia, onMediaChange]
  );

  const setThumbnail = useCallback(
    (videoPublicId: string, thumbnail: MediaThumbnail | undefined) => {
      onMediaChange(
        uploadedMedia.map((m) => (m.publicId === videoPublicId ? { ...m, thumbnail } : m))
      );
    },
    [uploadedMedia, onMediaChange]
  );

  const handleThumbnailChange = useCallback(
    async (video: UploadedMedia, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      setUploadError(null);
      if (file.type !== THUMBNAIL_TYPE) {
        setUploadError('Thumbnails must be JPEG images.');
        return;
      }
      if (file.size > THUMBNAIL_MAX_BYTES) {
        setUploadError('Thumbnails can be at most 2 MB.');
        return;
      }

      setThumbnailUploadingFor(video.publicId);
      try {
        const result = await uploadToCloudinaryClient(file);
        setThumbnail(video.publicId, { publicId: result.publicId, publicUrl: result.publicUrl });
      } catch (error) {
        setUploadError(`Failed to upload the thumbnail: ${error instanceof Error ? error.message : 'Upload failed'}`);
      } finally {
        setThumbnailUploadingFor(null);
      }
    },
    [setThumbnail]
  );

  const isUploading = uploadingFiles.length > 0 || thumbnailUploadingFor !== null;

  useEffect(() => {
    onUploadingChange?.(isUploading);
  }, [isUploading, onUploadingChange]);

  if (isConfigured === false) {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="warning">
          Media upload is currently unavailable. Please try again later or contact us.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Button component="label" color="primary" disabled={isUploading}>
        <FileUploadIcon />
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={handleFileChange}
        />
      </Button>

      {uploadError && (
        <Alert severity="error" sx={{ mt: 1 }} onClose={() => setUploadError(null)}>
          {uploadError}
        </Alert>
      )}

      {/* Uploading progress */}
      {uploadingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {uploadingFiles.map((uf) => (
            <Box key={uf.file.name} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Uploading {uf.file.name}...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={uf.progress}
                sx={{ mt: 0.5 }}
              />
              {uf.error && (
                <Typography variant="caption" color="error">
                  {uf.error}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}

      {/* Uploaded media preview */}
      {uploadedMedia.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {uploadedMedia.map((media, idx) => {
            const isImage = media.resourceType === 'image';
            const isVideo = media.resourceType === 'video';

            return (
              <Box
                key={`${media.publicId}-${idx}`}
                sx={{ position: 'relative', width: 120, height: 120 }}
              >
                <Box
                  component="button"
                  type="button"
                  onClick={() => setPreview(media)}
                  aria-label={`Preview ${media.originalFilename}`}
                  sx={{ p: 0, border: 0, width: '100%', height: '100%', cursor: 'zoom-in', background: 'none' }}
                >
                  {isImage && (
                    <img
                      src={media.previewUrl}
                      alt={media.originalFilename}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: 8,
                      }}
                    />
                  )}
                  {isVideo && (
                    <>
                      <video
                        src={media.previewUrl}
                        poster={media.thumbnail?.publicUrl}
                        muted
                        preload="metadata"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
                      />
                      <PlayCircleOutlineIcon
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: 40,
                          color: 'white',
                          pointerEvents: 'none',
                        }}
                      />
                    </>
                  )}
                </Box>
                {isVideo && (
                  <Box sx={{ position: 'absolute', top: 4, left: 4, display: 'flex', gap: 0.5 }}>
                    <Tooltip title={media.thumbnail ? 'Replace thumbnail' : 'Add thumbnail (JPEG, max 2 MB)'}>
                      <Button
                        component="label"
                        size="small"
                        variant="contained"
                        disabled={thumbnailUploadingFor !== null}
                        aria-label={`${media.thumbnail ? 'Replace' : 'Add'} thumbnail for ${media.originalFilename}`}
                        sx={{ minWidth: 0, p: 0.5 }}
                      >
                        {thumbnailUploadingFor === media.publicId
                          ? <CircularProgress size={16} color="inherit" />
                          : <AddPhotoAlternateIcon sx={{ fontSize: 16 }} />}
                        <input
                          type="file"
                          accept={THUMBNAIL_TYPE}
                          hidden
                          data-testid={`thumbnail-input-${media.publicId}`}
                          onChange={(e) => handleThumbnailChange(media, e)}
                        />
                      </Button>
                    </Tooltip>
                    {media.thumbnail && (
                      <Tooltip title="Remove thumbnail">
                        <Button
                          size="small"
                          variant="contained"
                          color="inherit"
                          aria-label={`Remove thumbnail for ${media.originalFilename}`}
                          onClick={() => setThumbnail(media.publicId, undefined)}
                          sx={{ minWidth: 0, p: 0.5 }}
                        >
                          <HideImageIcon sx={{ fontSize: 16 }} />
                        </Button>
                      </Tooltip>
                    )}
                  </Box>
                )}
                {/* Cloud upload indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 4,
                    left: 4,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    borderRadius: '50%',
                    p: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CloudDoneIcon sx={{ fontSize: 16, color: '#4caf50' }} />
                </Box>
                <Button
                  size="small"
                  color="error"
                  variant="contained"
                  sx={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    minWidth: 0,
                    p: 0.5,
                  }}
                  onClick={() => handleRemove(idx)}
                >
                  x
                </Button>
              </Box>
            );
          })}
        </Box>
      )}

      <MediaPreviewDialog
        media={preview && { url: preview.previewUrl, resourceType: preview.resourceType, name: preview.originalFilename }}
        onClose={() => setPreview(null)}
      />
    </Box>
  );
}
