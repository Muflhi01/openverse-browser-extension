import { removeSpinner } from './spinner';
import { elements, appObject } from './base';
import { addLoadMoreButton } from './helper';
import { activeBookmarkIdContainers, checkInternetConnection } from '../utils';
import { toggleBookmark } from './bookmarkModule.utils';
// eslint-disable-next-line import/no-cycle
import { activatePopup } from './infoPopupModule';

/**
 * @desc adds image components to the masonry grid.
 * @param {Object} msnryObject
 * @param {HTMLElement[]} imageComponents - an array of grid-items (image components).
 * @param {HTMLElement} gridDiv - the DOM element where the images components will be inserted.
 * @param {bool} forBookmarksSection - true if filling the images in bookmarks section.
 */
function appendToGrid(msnryObject, imageComponents, gridDiv, forBookmarksSection) {
  msnryObject.appended(imageComponents);
  // eslint-disable-next-line no-undef
  imagesLoaded(gridDiv).on('progress', () => {
    // layout Masonry after each image loads
    msnryObject.layout();
  });

  removeSpinner(elements.spinnerPlaceholderPrimary);
  if (forBookmarksSection) addLoadMoreButton(elements.loadMoreBookmarkButtonkWrapper);
  else if (msnryObject.cols) addLoadMoreButton(elements.loadMoreSearchButtonWrapper);
}

export function openInfoPopup(event) {
  if (event.target.classList.contains('image-thumbnail')) {
    checkInternetConnection();
    activatePopup(event.target);
  }
}

export function selectImage(event) {
  if (event.target.classList.contains('image-thumbnail')) {
    event.target.parentNode.classList.toggle('is-selected');
  }
}

/**
 * @desc visually prepares the bookmarks section when edit view is toggled
 * and applies the appropriate event listener to the images present in the grid.
 */
export function toggleEditView() {
  elements.editBookmarksLink.classList.toggle('display-none');
  elements.exportBookmarksLink.classList.toggle('display-none');
  elements.selectAllBookmarksLink.classList.toggle('display-none');
  elements.closeEditViewLink.classList.toggle('display-none');
  elements.bookmarksSectionFooter.classList.toggle('display-none');

  const images = elements.gridBookmarks.getElementsByClassName('image');

  for (let i = 0; i < images.length; i += 1) {
    const image = images[i];

    /**
     * if edit view is enabled, then on clicking an image, we want to "select" it.
     * else, we want the image-detail section for that image to open.
     */
    if (appObject.isEditViewEnabled) {
      image.removeEventListener('click', openInfoPopup);
      image.addEventListener('click', selectImage);
    } else {
      image.removeEventListener('click', selectImage);
      image.addEventListener('click', openInfoPopup);
    }
  }
}

/**
 * @desc Creates image components using the image data(image-id, license, thumbnail) and calls
 * "appendToGrid" to add these image components onto the DOM.
 * @param {Object} msnryObject
 * @param {HTMLElement[]} imageObjects - an array of image Objects.
 * @param {HTMLElement} gridDiv - the DOM element inside which the images components will be inserted.
 * @param {bool} forBookmarksSection - true if filling the images in bookmarks section
 */
export function addImagesToDOM(masonryObject, imageObjects, gridDiv, forBookmarksSection) {
  const imageComponents = [];
  const fragment = document.createDocumentFragment();

  chrome.storage.sync.get(activeBookmarkIdContainers, items => {
    // for storing image-ids of all bookmarks
    let allImageIds = [];
    activeBookmarkIdContainers.forEach(bookmarkIdContainerName => {
      allImageIds = [...allImageIds, ...Object.keys(items[bookmarkIdContainerName])];
    });

    imageObjects.forEach(image => {
      const thumbnail = image.thumbnail ? image.thumbnail : image.url;
      const imageId = image.id;
      const { license } = image;
      // split license string(eg: 'by-nc' -> ['by', 'nc'])
      const licenseArray = license.split('-');

      // make an image element
      const imgElement = document.createElement('img');
      imgElement.setAttribute('src', thumbnail);
      imgElement.setAttribute('class', 'image-thumbnail');
      imgElement.setAttribute('id', imageId);

      const licenseDiv = document.createElement('div');
      licenseDiv.classList.add('image-icons');

      // Array to hold license icon HTML elements
      const licenseIconElementsArray = [];

      // Add the default cc icon
      let licenseIconElement = document.createElement('i');
      licenseIconElement.classList.add('icon', 'has-background-white', 'cc-logo');
      licenseIconElementsArray.push(licenseIconElement);

      // make and push license icon elements
      licenseArray.forEach(name => {
        licenseIconElement = document.createElement('i');
        // for pdm, the logo name is cc-pd and for cc0, the logo name is cc-zero
        if (name === 'pdm') licenseIconElement.classList.add('icon', 'has-background-white', 'cc-pd');
        else if (name === 'cc0') licenseIconElement.classList.add('icon', 'has-background-white', 'cc-zero');
        else licenseIconElement.classList.add('icon', 'has-background-white', `cc-${name}`);
        licenseIconElementsArray.push(licenseIconElement);
      });

      // append all license icons into licenseDiv
      licenseIconElementsArray.forEach(licenseIcon => {
        licenseDiv.appendChild(licenseIcon);
      });

      // make a div element to encapsulate image element
      const divElement = document.createElement('div');
      divElement.classList.add('image', 'is-compact');

      // if the images are to be added in the bookmarks section
      if (forBookmarksSection) {
        // used for searching image div element
        divElement.id = `id_${imageId}`;
        divElement.setAttribute('data-image-id', imageId);

        // adding event listener to open popup or select image based depending on whether the
        // edit view is enabled or not
        if (appObject.isEditViewEnabled) divElement.addEventListener('click', selectImage);
        else divElement.addEventListener('click', openInfoPopup);
      }

      divElement.appendChild(imgElement);

      // if the images are to be added in the search section or the related-images section
      if (!forBookmarksSection) {
        // adding event listener to open image-detail section
        divElement.addEventListener('click', e => {
          if (e.target.classList.contains('image-thumbnail')) {
            checkInternetConnection();
            activatePopup(e.target);
          }
        });

        // Images in the search secton(or the related-images section) will
        // have bookmarks icon
        const bookmarkIconDiv = document.createElement('div');
        bookmarkIconDiv.classList.add('bookmark-icon');

        const bookmarkIcon = document.createElement('i');
        bookmarkIcon.classList.add('icon');
        bookmarkIcon.id = 'bookmark-icon';
        bookmarkIcon.addEventListener('click', toggleBookmark);
        // adding image information to HTML data attributes. These are
        // required for bookmarking/unbookmarking the images
        bookmarkIcon.setAttribute('data-image-id', imageId);
        bookmarkIcon.setAttribute('data-image-thumbnail', thumbnail);
        bookmarkIcon.setAttribute('data-image-license', license);

        bookmarkIconDiv.appendChild(bookmarkIcon);

        // choose the type of bookmark-icon depending on whether the image
        // is already bookmarked or not.
        if (allImageIds.indexOf(imageId) === -1) {
          bookmarkIcon.classList.add('bookmark-regular');
          bookmarkIcon.title = 'Bookmark image';
        } else {
          bookmarkIcon.classList.add('bookmark-solid');
          bookmarkIcon.title = 'Remove Bookmark';
        }

        divElement.appendChild(bookmarkIconDiv);
      }

      divElement.appendChild(licenseDiv);

      // div to act as grid itemj
      const gridItemDiv = document.createElement('div');
      gridItemDiv.setAttribute('class', 'grid-item');
      gridItemDiv.appendChild(divElement);

      fragment.appendChild(gridItemDiv);
      imageComponents.push(gridItemDiv);
    });

    gridDiv.appendChild(fragment);
    appendToGrid(masonryObject, imageComponents, gridDiv, forBookmarksSection);
  });
}
