import React, { useState, useEffect } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileUploaderProps } from '../../types/form';
import { useAuth } from '@clerk/nextjs';
import CustomComponent from "./CustomComponent";

const FileUploader: React.FC<FileUploaderProps> = ({ label, name, register, setValue, error, fieldSchema, uploadUrl }) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { getToken } = useAuth();

  // Handle file selection (Drag & Drop or Browse)
  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      console.error("Invalid file type or size");
      return;
    }
  
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]; // Now TypeScript knows this is always a File
      if (!selectedFile) return; // ✅ Extra safety check (not really needed but extra safe)
  
      setFile(selectedFile);
      setValue(name, selectedFile); // Register file in react-hook-form
  
      // ✅ Ensure selectedFile is defined before creating a preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setFilePreview(previewUrl);
  
      // Pass name (fieldName) when calling uploadFile
      uploadFile(selectedFile, name);
    }
  };
  
  

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] }, // Accept only images
  });

  // Upload file to S3 with progress tracking
  const uploadFile = async (file: File, fieldName: string) => {
    if (!file) return; // Prevents potential null issues

    setUploading(true);
    setUploadProgress(0); // Reset progress

    const token = await getToken();

    try {
      // Step 1: Request presigned URL with fieldName
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: JSON.stringify({ 
          fileType: file.type,
          fieldName: fieldName // Pass react-hook-form field name
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");

      const { url, fields } = await res.json();
      console.log("INFO", url, fields, "key", fields.key);

      // Step 2: Upload file to S3 with progress tracking
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", file);

      setValue(fieldName, fields.key); // Store file key from S3

      // Create XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 204) {
          console.log("Upload successful!");
          setUploadProgress(100);
        } else {
          console.error("Upload failed");
        }
        setUploading(false);
      };

      xhr.onerror = () => {
        console.error("Upload error");
        setUploading(false);
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Upload error:", error);
      setUploading(false);
    }
  };

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  return (
    <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>
      <div
        {...getRootProps()}
        className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-200/20 transition relative"
        style={{
          backgroundImage: filePreview ? `url(${filePreview})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          minHeight: "200px", // Ensures the drop area maintains a visible size
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <input {...register(name)} {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />

        {!filePreview && (
          <p className="text-gray-600 dark:text-gray-200">
            {uploading ? "Uploading..." : "Drag & drop or click to upload"}
          </p>
        )}

        {file ? (
          <div className="mt-2 bg-gray-800/50 p-3 rounded-lg">
            <p className="font-bold text-gray-100">{file.name}</p>
            <p className="text-sm text-gray-300">{file.type}</p>
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-200">
            {uploading ? "Uploading..." : "Drag & drop or click to upload"}
          </p>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 w-full p-2">
            <span className="text-white text-xs block mb-1 flex">{uploadProgress}% Uploaded</span>
            <div className="w-full h-2 bg-gray-300 rounded-full">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </CustomComponent>
  );
};

export default FileUploader;
