'use client';

import React, { useCallback, useState } from 'react';
import { Box, Button, LinearProgress, Typography, Alert } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import {
  uploadToCloudinaryClient,
  isCloudinaryClientConfigured,
} from '@/lib/cloudinary/clientUpload';

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
}

interface MediaUploaderProps {
  uploadedMedia: UploadedMedia[];
  onMediaChange: (media: UploadedMedia[]) => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  error?: string;
}

export function MediaUploader({ uploadedMedia, onMediaChange }: MediaUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isConfigured = isCloudinaryClientConfigured();

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

  const isUploading = uploadingFiles.length > 0;

  if (!isConfigured) {
    return (
      <Box sx={{ mb: 2 }}>
        <Alert severity="warning">
          Media upload is not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
          NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variables.
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
                  <video
                    src={media.previewUrl}
                    controls
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  />
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
    </Box>
  );
}
