const getArtistProfile = async (artistAddress: string) => {
  const response = await fetch(
    `https://inprocess.world/api/profile?address=${artistAddress}`
  );
  if (!response.ok) {
    throw new Error('Failed to get artist profile');
  }
  const data = await response.json();
  return data;
};

export default getArtistProfile;
