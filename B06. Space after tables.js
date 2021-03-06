
function setSpaceAfterTables20pt(body = DocumentApp.getActiveDocument().getBody()) {
  let childIndexTable, parAfterTable, parText;
  const tables = body.getTables();
  for (let i in tables) {
    childIndexTable = body.getChildIndex(tables[i]);
    parAfterTable = body.getChild(childIndexTable + 1);
    if (parAfterTable.getType() == DocumentApp.ElementType.PARAGRAPH) {
      parText = parAfterTable.asText().getText();
      if (parText != '') {
        body.insertParagraph(childIndexTable + 1, '').setHeading(DocumentApp.ParagraphHeading.NORMAL).setSpacingAfter(8);
      } else {
        parAfterTable.asParagraph().setHeading(DocumentApp.ParagraphHeading.NORMAL).setSpacingAfter(8);
      }

    }
  }
}
