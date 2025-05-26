// lib/supabaseStorage.js
import { supabase } from '@/lib/supabaseClient';

/**
 * Uploads a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The path within the bucket (e.g., 'profile-pictures/username')
 * @returns {Promise<string>} - URL of the uploaded file
 */
export const uploadFile = async (file, bucket, path) => {
  try {
    // Check if this is the company logo (special handling)
    let fileName;
    if (file.name === 'company-logo.png' || file.name === 'company-logo.jpg' || file.name === 'company-logo.jpeg') {
      fileName = file.name; // Keep the exact name for company logo
    } else {
      // Create a unique file name for other files
      const fileExt = file.name.split('.').pop();
      fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    }
    
    const filePath = path ? `${path}/${fileName}` : fileName;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) throw error;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Deletes a file from Supabase Storage
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The full path of the file within the bucket
 * @returns {Promise<void>}
 */
export const deleteFile = async (bucket, path) => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
};

/**
 * Lists all files in a directory
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The path to list
 * @returns {Promise<Array>} - Array of file objects
 */
export const listFiles = async (bucket, path) => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path);
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error listing files:', error);
    throw error;
  }
};
