
export default {
  Query: {
    character: async (_: any, { name, realm }: { name: string; realm: string }) => {
      return {
        name,
        realm,
      };
    },
  },
};
