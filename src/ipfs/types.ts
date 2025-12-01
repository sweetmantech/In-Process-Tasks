export type CreateERC1155TokenAttributes = {
  trait_type: string;
  value: string;
};

export type TokenMetadataJson = {
  name: string;
  description?: string;
  /** Primary image file */
  image?: string;
  animation_url?: string | null;
  content?: {
    mime: string;
    uri: string;
  } | null;
  attributes: Array<CreateERC1155TokenAttributes>;
};
