import React, { useState } from "react";
import { useDropzone, FileRejection } from "react-dropzone";
import { FileUploaderProps } from '../../types/form'
import { useAuth } from '@clerk/nextjs'
import CustomComponent from "./CustomComponent";

const FileUploader: React.FC<FileUploaderProps> = ({ label, name, register, validate, error, fieldSchema, uploadUrl }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { getToken } = useAuth()


  // Handle file selection (Drag & Drop or Browse)
  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      console.error("Invalid file type or size");
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile as File);
      uploadFile(selectedFile as File);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "image/*": [] }, // Accept only images
  });

  // Upload file to S3 using presigned POST URL
  const uploadFile = async (file: File) => {
    setUploading(true);
    const token = await getToken()
    try {
      // Step 1: Request presigned URL
      const res = await fetch(uploadUrl, {
        method: "POST",
        body: JSON.stringify({ fileType: file.type }),
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to get presigned URL");

      const { url, fields } = await res.json();
      console.log("INFO",url,fields)
      // Step 2: Upload file to S3
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", file);

      const uploadRes = await fetch(url, {
        method: "POST",
        body: formData,
        headers: {
          "Access-Control-Request-Method": "POST"
        }
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      console.log("Upload successful!");
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <CustomComponent label={label} name={name} error={error} fieldSchema={fieldSchema}>

    <div
      {...getRootProps()}
      className="border border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-200/20 transition"
    >
      <input {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)} />
      {file ? (
        <div className="mt-2">
          <p className="font-medium">{file.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-900">{file.type}</p>
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-200">
          {uploading ? "Uploading..." : "Drag & drop or click to upload"}
        </p>
      )}
    </div>
    </CustomComponent>
  );
};

export default FileUploader;
