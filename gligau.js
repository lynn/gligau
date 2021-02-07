// https://github.com/lojban/ilmentufa/blob/master/camxes.peg
camxes = require('./camxes')
const { among, numberSumti, simplifyTree, removeSpaces, removeMorphology } = require('./plixau')
const util = require('util')

const log = (x) => console.log(util.inspect(x, false, null, true))
const objMap = (obj, f) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, f(v)]));
const objStrMap = (obj, f) => objMap(obj, v => typeof v === 'string' ? f(v) : objStrMap(v, f));
const capitalize = (s) => s.replace(/^./, m => m.toUpperCase())
const rD = (x) => ({ nominative: x, accusative: x })
const rC = (inf, s, past, pp, ing) => ({ I:inf, you:inf, it:s, past, pp, ing })
const an = (x) => /^that /.test(x) ? x : (/^[aeiou]/.test(x) ? 'an' : 'a') + ' ' + x

const sumkahi_to_declension = {
    "mi": {nominative: "I", accusative: "me"},
    "do": rD("you"),
}

const verbConjugation = {
    be: { I:"am", you:"are", it:"is", past:"was", pp:"been", ing:"being" },
    talk: rC("talk", "talks", "talked", "talked", "talking"),
    go: rC("go", "goes", "went", "gone", "going"),
    sleep: rC("sleep", "sleeps", "slept", "slept", "sleeping"),
    think: rC("think", "thinks", "thought", "thought", "thinking"),
}

const passive = (cjg) => objMap(verbConjugation.be, v => v + ' ' + cjg.pp)

const gismuToConjugation = {
    "tavla": {
        "verb1": verbConjugation["talk"],
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
    },
    "lalxu": { noun1: "lake", },
    "ractu": { noun1: "rabbit" },
    "prenu": { noun1: "person" },
    "zdani": { noun1: "house" },
    "kumfa": { noun1: "room" },
    "cmalu": { adjective1: "small" },
    "zvati": { verb1: verbConjugation.be, prep2: "at" },
    "sipna": { verb1: verbConjugation.sleep },
    "jinvi": { verb1: verbConjugation.think },
    "melbi": {
        "adjective1": "beautiful",
        "noun2": "beauty admirer",
        "noun3": "beauty aspect",
        "noun4": "aesthetic standard",
        "prep2": "to",
        "prep3": "in",
        "prep4": "by standard",
    },
}

function sumtiToDeclension(sumti) {
    if (!among(sumti.type, ['sumti', 'sumti x'])) throw new Error();
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
        return rD(kc[0].word[0].toUpperCase())
    } else if (child.type === "description") {
        const kc = child.children.filter(c => c.type !== "KU")
        if (kc[0].type !== 'LE') throw new Unsupported();
        if (kc[1].type !== 'selbri') throw new Unsupported();
        const cj = selbriToConjugation(kc[1])
        return rD(an(cj.noun1));
    } else if (child.type === "name or name description") {
        const kc = child.children.filter(c => c.type !== "KU")
        const namepart = c => c.type === "cmevla" ? c.word : bestCjgWord(selbriToConjugation(c))
        return rD(kc.slice(1).map(x => capitalize(namepart(x))).join(" "))
    } else {
        throw new Unsupported();
    }
}

function tanruUnitToConjugation(tu) {
    if (tu.type !== 'gismu') throw new Unsupported();
    return gismuToConjugation[tu.word];
}
function bestCjgWord(cjg) {
    return cjg.adjective1 ?? cjg.noun1 ?? cjg.verb1.ing;
}
function selbriToConjugation(selbri) {
    if (selbri.type !== 'selbri') throw new Error();
    const n = selbri.children.length;
    if (selbri.children[0].type === 'NU') {
        return {noun1: 'that ' + sentence_to_english(selbri.children[1])}
    }
    const seltau = selbri.children.slice(0, n-1).map(tanruUnitToConjugation).map(bestCjgWord)
    const tertau = tanruUnitToConjugation(selbri.children[n-1]);
    const totalCjg = objStrMap(tertau, x => [...seltau, x].join(" "))
    return totalCjg
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
        } else if (c.type === 'FA') {
            // already interpreted by numberSumti
        } else {
            console.log('c', c)
        }
    }

    const selbri_c = selbriToConjugation(selbri)
    let finiteVerbForm = "it"
    let words = []
    if (sumti_x[1]) {
        const nom = sumti_x[1].nominative
        words.push(nom)
        if (nom === "I") finiteVerbForm = "I"
        if (nom === "you") finiteVerbForm = "you"
    } else {
        words.push("it")
    }
    if (selbri_c.verb1) {
        words.push(selbri_c.verb1[finiteVerbForm])
    } else if (selbri_c.adjective1) {
        words.push('is')
        words.push(selbri_c.adjective1)
    } else if (selbri_c.noun1) {
        words.push('is')
        words.push(an(selbri_c.noun1))
    }
    for (i = 2; i <= 5; i++) {
        if (sumti_x[i]) {
            if (selbri_c["prep"+i]) {
                words.push(selbri_c["prep"+i])
            }
            words.push(sumti_x[i].accusative)
        }
    }
    return words.join(' ')
}

uisMap = {"ku'i": "however", "si'a": "similarly"}

function text_to_english(text) {
    if (text.type !== 'text') throw new Error();
    const sentences = []
    const uis = []
    for (const c of text.children) {
        if (c.type === 'UI') {
            const ui = uisMap[c.word]
            if (ui) uis.push(ui)
        }
        if (c.type === 'sentence') {
            const e = sentence_to_english(c)
            sentences.push([...uis, e].join(", "))
            uis.length = 0;
        }
    }
    return sentences.map(s => s.replace(/^\w/, x => x.toUpperCase()) + '.').join(' ')
}

const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8');
simple = numberSumti(simplifyTree(removeSpaces(removeMorphology(camxes.parse(input)))))
console.log(text_to_english(simple[0]))


