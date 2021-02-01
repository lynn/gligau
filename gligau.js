// https://github.com/lojban/ilmentufa/blob/master/camxes.peg
camxes = require('./camxes')
const { among, numberSumti, simplifyTree, removeSpaces, removeMorphology } = require('./plixau')
const util = require('util')

log = (x) => console.log(util.inspect(x, false, null, true))
objMap = (obj, f) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, f(v)]));
regularDeclension = (x) => ({ nominative: x, accusative: x })
regularVerb = (inf, s, past, pp, ing) => ({ "I":inf, "you":inf, "it":s, "past":past, "pp":pp, "ing":ing })

sumkahi_to_declension = {
    "mi": {nominative: "I", accusative: "me"},
    "do": regularDeclension("you"),
}


verbConjugation = {
    "be": {"I":"am", "you":"are", "it":"is", "past":"was", "pp":"been", "ing":"being"},
    "talk": regularVerb("talk", "talks", "talked", "talked", "talking"),
    "go": regularVerb("go", "goes", "went", "gone", "going"),
}

passive = (cjg) => objMap(verbConjugation.be, v => v + ' ' + cjg.pp)

gismuToConjugation = {
    "tavla": {
        "verb1": "talks",
        "verb2": "is talked to", // could be defaults based on prep2~4
        "verb3": "is talked about",
        "verb4": "is talked in",
        "noun1": "speaker",
        "noun2": "listener",
        "noun3": "subject",
        "noun4": "language",
        "prep1": "by",
        "prep2": "to",
        "prep3": "about",
        "prep4": "in"
    },
    "xamgu": {
        "adjective1": "good",
        "noun1": "good thing",
        "noun2": "benefactor",
        "noun3": "standard",
        "prep1": "of",
        "prep2": "for",
        "prep3": "by standard",
    }
}

function sumtiToDeclension(sumti) {
    if (!among(sumti.type, ['sumti', 'sumti x'])) throw new Error();
    if (sumti.children.length !== 1) throw new Unsupported();
    const child = sumti.children[0]
    if (child.type === "sumka'i") {
        const kc = child.children
        if (kc.length !== 1) throw new Unsupported();
        if (kc[0].type !== 'KOhA') throw new Unsupported();
        return sumkahi_to_declension[kc[0].word]
    } else if (child.type === "letterals") {
        const kc = child.children
        if (kc.length !== 1) throw new Unsupported();
        if (kc[0].type !== 'BY') throw new Unsupported();
        return regularDeclension(kc[0].word[0].toUpperCase())
    } else if (child.type === "description") {
        const kc = child.children
        // if (kc.length !== 2) throw new Unsupported();
        if (kc[0].type !== 'LE') throw new Unsupported();
        if (kc[1].type !== 'selbri') throw new Unsupported();
        const cj = selbriToConjugation(kc[1])
        return regularDeclension("a " + cj.noun1);
    }
}

function selbriToConjugation(selbri) {
    if (selbri.type !== 'selbri') throw new Error();
    if (selbri.children.length !== 1) throw new Unsupported();
    if (selbri.children[0].type !== 'gismu') throw new Unsupported();
    return gismuToConjugation[selbri.children[0].word]
}

function sentence_to_english(sentence) {
    if (sentence.type !== 'sentence') throw new Error();
    let sumti_x = []
    let selbri = undefined
    for (const c of sentence.children) {
        if (c.type === 'sumti x') {
            sumti_x[c.sumtiPlace] = sumtiToDeclension(c)
        } else if (c.type === 'bridi tail') {
            for (const d of c.children) {
                if (d.type === 'selbri') {
                    selbri = d
                } else if (d.type === 'sumti x') {
                    sumti_x[d.sumtiPlace] = sumtiToDeclension(d)
                } else if (d.type === 'FA') {
                    // already interpreted by numberSumti
                } else {
                    console.log('d', d)
                }
            }
        } else if (d.type === 'FA') {
            // already interpreted by numberSumti
        } else {
            console.log('c', c)
        }
    }

    const selbri_c = selbriToConjugation(selbri)
    let words = []
    if (sumti_x[1]) {
        words.push(sumti_x[1].nominative)
    }
    if (selbri_c.verb1) {
        words.push(selbri_c.verb1)
    } else if (selbri_c.adjective1) {
        words.push('is')
        words.push(selbri_c.adjective1)
    }
    for (i = 2; i <= 5; i++) {
        if (sumti_x[i]) {
            if (selbri_c["prep"+i]) {
                words.push(selbri_c["prep"+i])
            }
            words.push(sumti_x[i].accusative)
        }
    }
    return words.join(' ').replace(/^\w/, x => x.toUpperCase()) + '.'
}

function text_to_english(text) {
    if (text.type !== 'text') throw new Error();
    const sentences = []
    for (const c of text.children) {
        if (c.type === 'sentence') {
            sentences.push(sentence_to_english(c))
        }
    }
    return sentences.join(' ')
}

var fs = require('fs');
var input = fs.readFileSync(0, 'utf-8');
// input = "ni'o mi tavla lo xamgu .i lo tavla ku xamgu .i xamgu do .i do tavla mi .i tavla mi cy. fo ly."
simple = numberSumti(simplifyTree(removeSpaces(removeMorphology(camxes.parse(input)))))
console.log(text_to_english(simple[0]))