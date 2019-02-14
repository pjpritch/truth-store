Transform API
schema to schema translation - dynamic serializer

Source Doc(s):

Schema Mapping:

- "OutField(s)": "SourceField"
              "SourceField.AnotherField[0].AnotherField"
              function (key, sourceDoc, outDoc) {
                ...
              }

{
  "id": "product-123",
  "name": "Product 123",
  "images": {
    "hires": "http://host/path/to.image.png"
  },
  "categoryId": "category-1",
  "sourceCity": "Harvard",
  "sourceState": "MA",
  "sourcePostalCode": "01451",
}

/transforms/v1/:transformId

saved in `_transforms`
PATCH into Transform.mappings[:transformId]
{
  "productId": "id",
  "imageUrl": "images.hires",
  "normalizedId": function(key, doc, outDoc) {
    return `${doc.categoryId}__${doc.id}`;
  },
  "source": function(key, doc, outDoc) {
    return {
      "city": doc.sourceCity,
      "state": doc.sourceState,
      "zip": doc.sourcePostalCode,
    };
  },
}

expected output: /transforms/v1/:transformId/render/:entityId/:instanceId(?...ctxParams)

{
  "productId": "product-123",
  "imageUrl": "http://host/path/to.image.png",
  "normalizedId": "category-1__product-123",
  "source": {
    "city": "Harvard",
    "state": "MA",
    "zip": "01451",
  }
}

if function returns a hash, mix in the fields, to allow for many fields at a time ...

expected output: /

Dynamic App Generator

- create site map 

'/': {
  title: 'Home',
  layout: '', // <-- should have
  context: '',
  component: '',
}
