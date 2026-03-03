const fetchMetadata = async (uri: string) => {
  const response = await fetch(
    `https://api.inprocess.world/api/moment/metadata?uri=${encodeURIComponent(uri)}`
  );

  if (!response.ok) throw new Error('failed to get metadata.');

  const data = await response.json();

  return data;
};

export default fetchMetadata;
