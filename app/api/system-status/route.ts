type SystemStatusResponse = {
  googleApiConfigured: boolean;
  dataSource: "Demo veri";
  version: "MVP";
};

export function GET(): Response {
  const response: SystemStatusResponse = {
    googleApiConfigured: Boolean(process.env.GOOGLE_PLACES_API_KEY),
    dataSource: "Demo veri",
    version: "MVP",
  };

  return Response.json(response);
}
