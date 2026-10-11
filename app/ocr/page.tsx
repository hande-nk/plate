"use client";

import React, { useState } from 'react';
import { createWorker } from 'tesseract.js';

export const OcrReader: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(URL.createObjectURL(file));
      parseImage(file);
    }
  };


  const parseImage = async (imageFile: File) => {
    setStatus('Initializing Tesseract worker...');
    
    // Create and initialize the worker
    const worker = await createWorker('eng');

    try {
      setStatus('Recognizing text...');
      const ret = await worker.recognize(imageFile);
      setOcrText(ret.data.text);
      setStatus('Done!');
    } catch (err) {
      console.error(err);
      setStatus('Error during OCR processing.');
    } finally {
      await worker.terminate();
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Tesseract.js OCR in React (.tsx)</h2>
      <input type="file" accept="image/*" onChange={handleImageChange} />
      
      {selectedImage && (
        <div style={{ marginTop: '10px' }}>
          <img src={selectedImage} alt="Uploaded preview" style={{ maxWidth: '300px', display: 'block', margin: '10px 0' }} />
        </div>
      )}

      <p><strong>Status:</strong> {status}</p>

      <div style={{ marginTop: '10px' }}>
        <h3>Extracted Text:</h3>
        <textarea
          value={ocrText}
          readOnly
          rows={8}
          style={{ width: '100%', maxWidth: '500px' }}
        />
      </div>
    </div>
  );
};