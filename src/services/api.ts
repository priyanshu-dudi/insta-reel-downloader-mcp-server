import axios from 'axios';

export interface ReelResponse {
  videoUrl: string;
  originalUrl: string;
}

export const downloadReel = async (url: string): Promise<ReelResponse> => {
  try {
    const response = await axios.post('/api/download', { url });
    return response.data;
  } catch (error: any) {
    const errorMessage = error.response?.data?.error || 'Failed to download reel';
    const errorDetails = error.response?.data?.details;
    throw new Error(errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage);
  }
};
