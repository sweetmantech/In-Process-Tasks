const getMediaBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download photo: ${response.status} ${response.statusText}`
    );
  }

  const blob = await response.blob();
  return blob;
};

export default getMediaBlob;
