const schema = {
  properties: {
    body: {
      type: 'string',
      minLength: 1,
      pattern: '\\/\\/Z$',
    },
  },
  required: ['body'],
};

export default schema;
