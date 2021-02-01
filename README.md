# la gligau
This is an experimental tool to translate sentences from [Lojban](http://lojban.io/) to English.

Rather than [statistical machine translation](https://github.com/mhagiwara/zmifanva), it processes a [camxes](http://lojban.github.io/ilmentufa/camxes.html) parse tree transforms it into an English sentence.

To run it, install [Node.js](https://nodejs.org/en/) and run:

    echo ".i mi tavla" | node gligau.js

## Credits
The `camxes.js` file is a compressed version of the one in the [ilmentufa repo](https://github.com/lojban/ilmentufa/blob/master/camxes.js). It's generated from the camxes PEG file by Masato Hagiwara.

The `plixau.js` file is a collection of helper methods that I copied from the [ilmentufa glosser](https://github.com/lojban/ilmentufa/blob/master/glosser/tree.js) for cleaning up the tree, tagging sumti positions, etc.

