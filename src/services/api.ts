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
    const errorData = error.response?.data;
    let errorMessage = errorData?.error || 'Failed to download reel';
    
    if (typeof errorMessage === 'object') {
      errorMessage = JSON.stringify(errorMessage);
    }

    const errorDetails = errorData?.details;
    let detailsStr = '';
    
    if (errorDetails) {
      detailsStr = typeof errorDetails === 'object' ? JSON.stringify(errorDetails) : String(errorDetails);
    }

    throw new Error(detailsStr ? `${errorMessage}: ${detailsStr}` : String(errorMessage));
  }
};
