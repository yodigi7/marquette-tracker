# No generated document files

The two instructor documents — the cycle summary and the instructor chart — are rendered by the app and
handed to the browser's own print or save action. The app never generates a PDF, PNG, or any other
document file itself.

Generating them would mean pulling in a PDF library and reimplementing pagination, page breaks, and print
styling that the browser already does correctly. It would also fix paper size on our terms, when choosing
landscape for the wide chart is the user's call at the print dialog.

The cost we accept: output varies with the user's own print settings, and we cannot guarantee a page
count. Every printable route therefore has to survive being read in the browser's print preview rather
than assumed from the screen.
