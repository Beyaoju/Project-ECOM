import React,{useState, useRef, useEffect} from 'react';
import FormChars from './FormChars.jsx';
import Review from './Review.jsx';
import FormStarRating from './FormStarRating.jsx';
import axios from 'axios';

const ReviewForm = (props) => {
  const [file, setFile] = useState([]);
  const [imgPreview, setImgPreview] = useState([]);
  const [form, setForm] = useState({});
  const [attributes, setAttributes] = useState({});

  async function onFileChange (e) {
    e.persist();

    let arrOfFiles = Object.values(e.target.files);

    function getBase64(file) {
      const reader = new FileReader();
      return new Promise(resolve => {
        reader.readAsDataURL(file);
        reader.onloadend = () => {
          resolve(reader.result);
        }
      });
    };

    const promiseArray = [];
    arrOfFiles.forEach(file => promiseArray.push(getBase64(file)));
    let arrOfBlobs = await Promise.all(promiseArray);
    setImgPreview([...imgPreview].concat(arrOfBlobs));
  }

  async function onFormSubmit (e) {
    e.preventDefault();
    e.persist();
    let arrOfS3UrlPromises = [];

    imgPreview.forEach(img => {
      let getUrl = axios({
        method: 'GET',
        url: 'http://localhost:3000/s3Url'
      }).then(data => data.data);
      arrOfS3UrlPromises.push(getUrl);
    });

    let arrOfS3Urls = await Promise.all(arrOfS3UrlPromises);

    let arrOfS3SuccessPutPromise = [];

    arrOfS3Urls.forEach((s3url, index) => {
      const base64 = imgPreview[index];
      const base64Data = new Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');

      let successCall = axios({
        method: 'PUT',
        url: s3url,
        headers: {
          'Content-Type': 'image/jpeg',
          'Content-Encoding': 'base64'
        },
        data: base64Data
      });

      arrOfS3SuccessPutPromise.push(successCall);
    });

    let arrOfS3SuccessPuts = await Promise.all(arrOfS3SuccessPutPromise);

    let s3photoUrlsArray = arrOfS3SuccessPuts.map(s3url => {
      return s3url.config.url.split('?')[0];
    });

    let productId = props.productId;
    form.photos = s3photoUrlsArray;
    form.product_id = props.productId;

    axios({
      method: 'post',
      url: 'http://localhost:3000/review',
      data: form
    })
    .then(success => {
      console.log('Successfully posted review - getting reviews');
      props.getReviews();
    })
    .catch(err => console.log(err))
  }

  function onFormChange(e) {
    if (e.target.name !== 'image') {
      if (e.target.name === 'recommend') {
        let bool = Boolean(e.target.value);
        setForm({...form, [e.target.name]: bool})
      } else if (e.target.name === 'rating') {
        let num = Number(e.target.value);
        setForm({...form, [e.target.name]: num});
      } else if (e.target.dataset.label) {
        let formCopy = {...form};
        if (formCopy.characteristics === undefined) {
          formCopy.characteristics = {};
        }
        let value = Number(e.target.value);

        formCopy.characteristics[e.target.id] = value;
        setForm(formCopy);
      } else {
        setForm({...form, [e.target.name]: e.target.value})
      }
    }
  };



  return(
    <div className="form-container">
      <div className="form-image" />
      <div className="product-review-form-container">
        <form id="review" onSubmit={onFormSubmit} onChange={onFormChange}>
          <h3>Submit a Review</h3>
          <h4>Tell us what you think!</h4>
          <FormStarRating />

          <fieldset>
            <input name="name" type="text" placeholder="Name" tabIndex="1" autoFocus required></input>
          </fieldset>
          <fieldset>
            <input name="email" type="email" placeholder="Email" tabIndex="2" required></input>
          </fieldset>
          <div className="select" required>
            <div>Recommmend?</div>
            <div><input name="recommend" type="radio" value="false" required/> No</div>
            <div><input name="recommend" type="radio" value="true" required/> Yes</div>
          </div>
          <fieldset>

            <input name="summary" type="text" placeholder="Review Summary" required tabIndex="3" required></input>

          </fieldset>
          <fieldset>
            <textarea name="body" placeholder="Type your Message Here...." tabIndex="4" required></textarea>
          </fieldset>


          <fieldset>
            <FormChars meta={props.meta} />
          </fieldset>

          {(imgPreview.length) && (
            <div className="review-photo-holder">
              {imgPreview.map(src => <img key={src} src={src} />)}
            </div>
          )}

          <fieldset className="relative-fieldset">
            <label className="custom-file-upload">
                <input name="image" id="imageInput" type="file" accept="image/*" multiple="multiple" onChange={onFileChange}/>
                <i className="fa fa-cloud-upload"></i> Upload Images
            </label>
          </fieldset>

          <fieldset>
            <button name="submit" type="submit" id="review-submit" data-submit="...Sending" tabIndex="6">Submit</button>
          </fieldset>
        </form>
      </div>
    </div>
  );
}

export default ReviewForm;