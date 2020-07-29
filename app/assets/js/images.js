const _form = document.querySelector('[data-s3-uppy="form"]');
const _log = document.querySelector('[data-s3-uppy="log"]');

const uppy = Uppy.Core({
  autoProceed: true,
  restrictions: {
    maxFileSize: 2097152,  // Limit size to 2 MB on the javascript side
    maxNumberOfFiles: 3,
    allowedFileTypes: ['image/png', 'image/jpeg', 'image/webp']
  }
})
  .use(Uppy.Dashboard, {
    inline: true,
    target: '#drag-drop-area',
    note: 'Images only, up to 3 files, 2MB each',
    width: '100%',
    height: 350
  })
  .use(Uppy.DragDrop)
  .use(Uppy.GoldenRetriever)
  .use(Uppy.AwsS3, {
    getUploadParameters() {
      // 1. Get URL to post to from action attribute
      const _url = _form.getAttribute('action');
      // 2. Create Array from FormData object to make it easy to operate on
      const _formDataArray = Array.from(new FormData(_form));
      // 3. Create a JSON object from array
      const _fields = _formDataArray.reduce((acc, cur) => ({ ...acc, [cur[0]]: cur[1] }), {});

      // 4. Return resolved promise with Uppy. Uppy it will add file in file param as the last param
      return Promise.resolve({
        method: 'POST',
        url: _url,
        fields: _fields
      });
    }
  });

uppy.on('upload-success', (_file, data) => {
  // const li = document.createElement('li');
  // li.textContent = data.body.location;
  // _log.appendChild(li);
});

uppy.on('complete', ({ failed, successful }) => {
  /*
    For every successfully uploaded image to S3, send request to the Instance
    that will create a model with the uploaded image's URL as direct_url param.
  */
  Promise.all(successful.map(({ response }) => createImage(response.body.location)))
  .then(() => {
    alert('ok');
  });
});

const createImage = imageUrl => {
  // Get logged in user id
  const userId = _form.dataset.s3UppyUserId;
  const itemUuid = _form.dataset.itemUuid;

  // Create model for this user with s3 image url
  return fetch('/api/items/photos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify({ photo: { direct_url: imageUrl, user_id: userId, item_uuid: itemUuid }})
  }).then(response => response.json());
};