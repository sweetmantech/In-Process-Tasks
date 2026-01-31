const indexMessageMoment = async (messageId: string) => {
  const response = await fetch(
    `https://api.inprocess.world/api/message/index-moment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId,
      }),
    }
  );
  const data = await response.json();
  return data;
};

export default indexMessageMoment;
