'use client';

import React, { useCallback } from 'react';
import { Box, Button } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';

interface MediaUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export function MediaUploader({ files, onFilesChange }: MediaUploaderProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const newFiles = Array.from(e.target.files).filter(
          (file) => !files.some((f) => f.name === file.name && f.size === file.size)
        );
        onFilesChange([...files, ...newFiles]);
      }
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [files, onFilesChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <Box sx={{ mb: 2 }}>
      <Button component="label" color="primary">
        <FileUploadIcon />
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={handleFileChange}
        />
      </Button>

      {files.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {files.map((file, idx) => {
            const url = URL.createObjectURL(file);
            const isImage = file.type.startsWith('image/');
            const isVideo = file.type.startsWith('video/');

            return (
              <Box
                key={`${file.name}-${idx}`}
                sx={{ position: 'relative', width: 120, height: 120 }}
              >
                {isImage && (
                  <img
                    src={url}
                    alt={file.name}
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
                    src={url}
                    controls
                    style={{ width: '100%', height: '100%', borderRadius: 8 }}
                  />
                )}
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
                  ✕
                </Button>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
