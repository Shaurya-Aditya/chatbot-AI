// NOTE: You need to install 'formidable' and 'form-data' for this API route to work:
// npm install formidable form-data
import type { NextApiRequest, NextApiResponse } from 'next';
import formidable, { File as FormidableFile, Fields, Files } from 'formidable';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

const VECTOR_STORE_ID = 'vs_6824baf19a188191ad264f4a377257ec';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err: any, fields: Fields, files: Files) => {
    if (err) {
      return res.status(500).json({ error: 'Error parsing file' });
    }
    const uploaded = files.file;
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    try {
      const fileStream = fs.createReadStream(file.filepath);
      const formData = new FormData();
      formData.append('file', fileStream, file.originalFilename || 'upload');
      const openaiRes = await fetch(`https://api.openai.com/v1/vector_stores/${VECTOR_STORE_ID}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
        body: formData as any,
      });
      if (!openaiRes.ok) {
        const error = await openaiRes.text();
        return res.status(500).json({ error: 'OpenAI upload failed', details: error });
      }
      const data = await openaiRes.json();
      return res.status(200).json({ success: true, data });
    } catch (e) {
      return res.status(500).json({ error: 'Upload failed', details: e instanceof Error ? e.message : e });
    }
  });
} 