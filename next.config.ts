import { createVanillaExtractPlugin } from "@vanilla-extract/next-plugin";

export default createVanillaExtractPlugin()({
  agentRules: false,
  images: {
    remotePatterns: [new URL("https://pets-images.dev-apis.com/pets/**")],
  },
});
