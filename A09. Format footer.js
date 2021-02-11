const paragraphStyle_FOOTER_SEC = {
  namedStyleType: 'NORMAL_TEXT'
};

const textStyle_FOOTER_SEC = {
  foregroundColor: {
    color: {
      rgbColor: {
        green: 0.36078432,
        red: 1.0
      }
    }
  },
  fontSize: {
    magnitude: 10,
    unit: 'PT'
  },
  bold: false,
  weightedFontFamily: {
    fontFamily: 'Montserrat',
    weight: 400
  }
};

const textStyle_FOOTER_SEC_UPDATE = {
  fontSize: {
    magnitude: 10,
    unit: 'PT'
  },
  weightedFontFamily: {
    fontFamily: 'Montserrat',
    weight: 400
  }
};

function formatFooter(onlyFooter = true) {

  let requests = [];
  // Retrieve title of document
  let title = '';
  let par = DocumentApp.getActiveDocument().getBody().getParagraphs();
  for (let i in par) {
    if (par[i].getHeading() == DocumentApp.ParagraphHeading.TITLE) {
      title += par[i].getText() + ' ';
    }
  }
  // End. Retrieve title of document

  let ui = DocumentApp.getUi();
  documentId = DocumentApp.getActiveDocument().getId();
  document = Docs.Documents.get(documentId);

  if (title == '') {
    title = 'Title of document as shown on cover page';
  }

  title = title.trim();

  let result;
  if (document.documentStyle.defaultFooterId == null) {
    Logger.log('Insert footer');
    result = insertFooter(requests, documentId, title);
  } else {
    Logger.log('Update footer');
    result = updateFooter(requests, documentId, document, title);
  }

  if (result.status == 'error') {
    if (onlyFooter) {
      ui.alert(result.message);
      return 0;
    } else {
      return { status: 'error', message: result.message };
    }
  }

  let warningMessage = '';
  if (result.footerContentExists === false && title == '') {
    warningMessage = '\nPlease replace \'Title of document\' in footer to real title of your document.';
  }

  if (result.pageNumbersAdded === false) {
    warningMessage += '\n\nAdd right tab-stop and page numbers to footer';
  }

  if (warningMessage != '') {
    ui.alert(warningMessage);
  }

  return { status: 'ok', requests: requests };
}

function insertFooter(requests, documentId, title) {
  try {
    let requests2 = [];
    requests2.push(
      {
        createFooter: {
          type: 'DEFAULT'
        }
      }
    );
    Docs.Documents.batchUpdate({ requests: requests2 }, documentId);

    let document = Docs.Documents.get(documentId);

    let footerId;
    if (document.documentStyle.defaultFooterId == null) {
      Logger.log('No footer');
    } else {
      footerId = document.documentStyle.defaultFooterId;
    }

    let requests = [];
    requests.push(
      {
        updateDocumentStyle: {
          documentStyle: {
            useFirstPageHeaderFooter: true,
            pageNumberStart: 0
          },
          fields: 'pageNumberStart,useFirstPageHeaderFooter'
        }
      }
    );

    helpFooterInsertTitle(footerId, title, requests);

    Docs.Documents.batchUpdate({ requests: requests }, documentId);
    return { status: 'ok', pageNumbersAdded: false, footerContentExists: false };
  }
  catch (error) {
    return { status: 'error', message: 'Error in insertFooter. ' + error };
  }
}

function updateFooter(requests, documentId, document, title) {
  try {
    let footerId = document.documentStyle.defaultFooterId;

    // Check and remove firstPageFooter
    let firstPageFooterId;
    if (document.documentStyle.firstPageFooterId != null) {
      firstPageFooterId = document.documentStyle.firstPageFooterId;
      requests.push(
        {
          deleteFooter: {
            footerId: firstPageFooterId
          }
        }
      );
    }
    // End. Check and remove firstPageFooter

    // Set up paragraph style and different footer for first page
    let endIndex = document.footers[footerId].content[0].endIndex;
    requests.push(
      {
        updateDocumentStyle: {
          documentStyle: {
            useFirstPageHeaderFooter: true,
            pageNumberStart: 0
          },
          fields: 'pageNumberStart,useFirstPageHeaderFooter'
        }
      },
      {
        updateParagraphStyle: {
          paragraphStyle: paragraphStyle_FOOTER_SEC,
          range: {
            segmentId: footerId,
            startIndex: 0,
            endIndex: endIndex
          },
          fields: formFieldsString(paragraphStyle_FOOTER_SEC)
        }
      },
    );
    // End. Set up paragraph style and different footer for first page


    // Set up Montserrat 10 pt
    let footerContent = '';
    let pageNumbersAdded = false;

    document.footers[footerId].content.forEach(function (item) {
      item.paragraph.elements.forEach(function (item) {
        if (item.textRun) {
          footerContent += item.textRun.content;
          helpFooterUpdate(footerId, item, item.textRun, requests);
        } else {
          if (item.autoText) {
            if (item.autoText.type == 'PAGE_NUMBER') {
              pageNumbersAdded = true;
              helpFooterUpdate(footerId, item, item.autoText, requests);
              numberItem = item;
            }
          }
        }
      });
    });
    // End. Set up Montserrat 10 pt

    // Situation when footer is already added but doesn't contain text
    let footerContentExist = true;
    if (footerContent.trim() == '') {

      footerContentExist = false;

      requests.forEach(function (item) {
        if (item.updateTextStyle) {
          styleItem = item.updateTextStyle;
        } else if (item.updateParagraphStyle) {
          styleItem = item.updateParagraphStyle;
          return;
        } else {
          return;
        }

        styleItem.range.startIndex = styleItem.range.startIndex + title.length;
        styleItem.range.endIndex = styleItem.range.endIndex + title.length;

      });

      let removeRequests = [];
      for (let i in requests) {
        if (requests[i].updateParagraphStyle) {
          if (requests[i].updateParagraphStyle.range.segmentId == footerId) {
            removeRequests.push(Number(i));
          }
        }
      }
      for (let i in removeRequests) {
        requests.splice(removeRequests[i], 1);
      }
      helpFooterInsertTitle(footerId, title, requests);
    }
    // End. Situation when footer is already added but doesn't contain text

    Docs.Documents.batchUpdate({ requests: requests }, documentId);
    return { status: 'ok', pageNumbersAdded: pageNumbersAdded, footerContentExist: footerContentExist };

  }
  catch (error) {
    return { status: 'error', message: 'Error in updateFooter. ' + error };
  }
}


function helpFooterUpdate(footerId, item, textRunOrAutoText, requests) {
  textRunOrAutoText.textStyle['fontSize'] = { magnitude: 10, unit: 'PT' };
  textRunOrAutoText.textStyle['weightedFontFamily'] = { fontFamily: 'Montserrat', weight: 400 };

  if (item.startIndex == null) {
    item.startIndex = 0;
  }

  requests.push({
    updateTextStyle: {
      textStyle: textRunOrAutoText.textStyle,
      range: {
        segmentId: footerId,
        startIndex: item.startIndex,
        endIndex: item.endIndex
      },
      fields: formFieldsString(textRunOrAutoText.textStyle)
    }
  });
}

function helpFooterInsertTitle(footerId, title, requests) {

  requests.unshift(
    {
      insertText: {
        location: {
          segmentId: footerId,
          index: 0
        },
        text: title
      }
    },
    {
      updateParagraphStyle: {
        paragraphStyle: paragraphStyle_FOOTER_SEC,
        range: {
          segmentId: footerId,
          startIndex: 0,
          endIndex: title.length
        },
        fields: formFieldsString(paragraphStyle_FOOTER_SEC)
      }
    },
    {
      updateTextStyle: {
        textStyle: textStyle_FOOTER_SEC,
        range: {
          segmentId: footerId,
          startIndex: 0,
          endIndex: title.length + 1
        },
        fields: formFieldsString(textStyle_FOOTER_SEC)
      }
    }
  );

}