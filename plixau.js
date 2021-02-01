function removeSpaces(tree) {
    if (tree.length > 0 && among(tree[0], ["spaces", "initial_spaces"])) return null;
    var i = 0;
    while (i < tree.length) {
        if (isArray(tree[i])) {
            tree[i] = removeSpaces(tree[i]);
            if (tree[i] === null) tree.splice(i--, 1);
        }
        i++;
    }
    return tree;
}

/*
 * EXAMPLE OF PARSE TREE PRUNING PROCEDURE
 * 
 * removeMorphology(parse_tree)
 * 
 * This function takes a parse tree, and joins the expressions of the following
 * nodes:
 * "cmevla", "gismu_2", "lujvo", "fuhivla", "spaces"
 * as well as any selmaho node (e.g. "KOhA").
 * 
 */

function removeMorphology(pt) {
    if (pt.length < 1) return [];
    var i;
    /* Sometimes nodes have no label and have instead an array as their first
       element. */
    if (isArray(pt[0])) i = 0;
    else { // The first element is a label (node name).
        // Let's check if this node is a candidate for our pruning.
        if (isTargetNode(pt)) {
            /* We join recursively all the terminal elements (letters) in this
             * node and its child nodes, and put the resulting string in the #1
             * slot of the array; afterwards we delete all the remaining elements
             * (their terminal values have been concatenated into pt[1]). */
            pt[1] = joinExpr(pt);
            // If pt[1] contains an empty string, let's delete it as well:
            pt.splice((pt[1] == "") ? 1 : 2);
            return pt;
        }
        i = 1;
    }
    /* If we've reached here, then this node is not a target for pruning, so let's
       do recursion into its child nodes. */
    while (i < pt.length) {
        if (isArray(pt[i])) removeMorphology(pt[i]);
        i++;
    }
    return pt;
}

/* This function returns the string resulting from the recursive concatenation of
 * all the leaf elements of the parse tree argument (except node names). */
function joinExpr(n) {
    if (n.length < 1) return "";
    var s = "";
    var i = isArray(n[0]) ? 0 : 1;
    while (i < n.length) {
        s += isString(n[i]) ? n[i] : joinExpr(n[i]);
        i++;
    }
    return s;
}

/* Checks whether the argument node is a target for pruning. */
function isTargetNode(n) {
    return (among(n[0], ["cmevla", "gismu", "lujvo", "fuhivla", "initial_spaces"])
            || is_selmaho(n[0]));
}

function among(v, s) {
    var i = 0;
    while (i < s.length) if (s[i++] == v) return true;
    return false;
}

function is_selmaho(v) {
    if (!isString(v)) return false;
    return (0 == v.search(/^[IUBCDFGJKLMNPRSTVXZ]?([AEIOUY]|(AI|EI|OI|AU))(h([AEIOUY]|(AI|EI|OI|AU)))*$/g));
}

function isArray(v) {
    return Object.prototype.toString.call(v) === '[object Array]';
}

function isString(s) {
    return typeof(s) === 'string' || s instanceof String;
}

/**
 * This file contains functions that simplify the parse tree returned by camxes.js.
 * 
 * The original parse tree has the following structure:
 * [
 *   "...",   // the type
 *   ...      // children as array elements
 * ]
 * Here, the first element of every array indicates the type of the object parsed, and the
 * next objects are the children of the element.
 * 
 * The simplified parse tree has quite another structure:
 * [
 *   {
 *     type: "...",
 *     children: [ ... ],   // only one of children and word
 *     word: "...",
 *     ...: ...             // other optional elements
 *   }
 * ]
 * Here, type gives the type. For non-terminals, children is an array containing the children.
 * For terminals, word contains the actual word parsed. (Of course, one cannot have both
 * children and word.) Furthermore, there can be more elements added to this structure to add
 * additional information as needed.
 */

/**
 * Simplifies the given parse tree. Returns an array.
 */
function simplifyTree(parse) {
    
    // if it is a terminal, just return that
    if (parse.length == 2 && isString(parse[0]) && isString(parse[1])) {
        return [{
            type: parse[0],
            word: parse[1]
        }]
    }
    
    var f = simplifyFunctions[parse[0]];
    
    // if there is a simplification function, apply it
    if (f) {
        return [f(parse)];
    }
    
    // else, we recursively search the children for things we do have a simplification function for
    var result;
    if (isString(parse[0])) {
        result = simplifyArrayOfTrees(parse.slice(1));
    } else {
        result = simplifyArrayOfTrees(parse);
    }
    
    return result;
}

/**
 * Simplifies an array of trees.
 */
function simplifyArrayOfTrees(parse) {
    
    var result = [];
    
    for (var i in parse) {
        result = result.concat(simplifyTree(parse[i]));
    }
    
    return result;
}


// The simplification functions

var simplifyFunctions = {};

simplifyFunctions["text"] = function(parse) {
    
    return {
        type: "text",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["free"] = function(parse) {
    
    return {
        type: "free modifier",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["sentence"] = function(parse) {
    
    return {
        type: "sentence",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["prenex"] = function(parse) {
    
    return {
        type: "prenex",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["bridi_tail"] = function(parse) {
    
    return {
        type: "bridi tail",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["selbri"] = function(parse) {
    
    return {
        type: "selbri",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["sumti"] = function(parse) {
    
    return {
        type: "sumti",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["sumti_6"] = function(parse) {
    
    // sumti-6 <- ZO-clause free* /
    //            ZOI-clause free* /
    //            LOhU-clause free* /
    //            lerfu-string !MOI-clause BOI-clause? free* /
    //            LU-clause text LIhU-clause? free* /
    //            (LAhE-clause free* / NAhE-clause BO-clause free*) relative-clauses? sumti LUhU-clause? free* /
    //            KOhA-clause free* /
    //            LA-clause free* relative-clauses? CMENE-clause+ free* /
    //            (LA-clause / LE-clause) free* sumti-tail KU-clause? free* /
    //            li-clause
    
    if (parse[1][0] === "ZO_clause") {
        return {
            type: "one-word quote",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "ZOI_clause") {
        return {
            type: "non-Lojban quote",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "LOhU_clause") {
        return {
            type: "ungrammatical quote",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "lerfu_string") {
        return {
            type: "letterals",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "LU_clause") {
        return {
            type: "grammatical quote",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] instanceof Array) {
        if (parse[1][0][0] === "LAhE_clause") {
            return {
                type: "reference sumti",
                children: simplifyArrayOfTrees(parse.slice(1))
            }
        }
        
        if (parse[1][0][0] === "NAhE_clause") {
            return {
                type: "negated sumti",
                children: simplifyArrayOfTrees(parse.slice(1))
            }
        }
    }
    
    if (parse[1][0] === "KOhA_clause") {
        return {
            type: "sumka'i",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "LA_clause") {
        return {
            type: "name or name description", // TODO how to disambiguate between those two?
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "LE_clause") {
        return {
            type: "description",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    if (parse[1][0] === "li_clause") {
        return {
            type: "number",
            children: simplifyArrayOfTrees(parse.slice(1))
        }
    }
    
    return {
        type: "unknown type sumti (bug?)",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}

simplifyFunctions["relative_clause"] = function(parse) {
    
    return {
        type: "relative clause",
        children: simplifyArrayOfTrees(parse.slice(1))
    }
}



// Additional functions to improve the resulting tree

/**
 * Numbers the placed sumti in the parse tree. That is, replaces the type "sumti" by either
 * "sumti x" if it is a normally placed sumti, or "modal sumti" if it is a modal sumti.
 * If it is a sumti in a vocative or something like that, which is not placed at all, it will
 * just leave "sumti".
 * 
 * For placed sumti, also an attribute sumtiPlace is added with the place number.
 */
function numberSumti(parse) {
    
    // if it is a terminal, do nothing
    if (parse.length == 2 && isString(parse[0]) && isString(parse[1])) {
        return parse
    }
    
    // if it is a sentence, start searching through it
    if (parse.type === "sentence") {
        numberSumtiInSentence(parse);
    }
    
    // and recursively search the children for things we can number as well
    for (var i in parse) {
        if (!isString(parse[i])) {
            numberSumti(parse[i]);
        }
    }
    
    return parse;
}

function numberSumtiInSentence(parse) {
    
    // first, for convenience, merge the bridi head and tail together in one array
    var sentenceElements = [];
    
    for (var i = 0; i < parse.children.length; i++) {
        var child = parse.children[i];
        
        if (child.type === "bridi tail") {
            sentenceElements.push({type: "bridi tail start"});
            for (var j = 0; j < child.children.length; j++) {
                var subchild = child.children[j];
                sentenceElements.push(subchild);
            }
        } else {
            sentenceElements.push(child);
        }
    }
    
    // now walk through this array
    var sumtiCounter = 1;
    var bridiTailStartSumtiCounter = 1;
    var nextIsModal = false;
    
    for (var i = 0; i < sentenceElements.length; i++) {
        var child = sentenceElements[i];

        if (child.type === "bridi tail start") {
            bridiTailStartSumtiCounter = sumtiCounter;
        }

        if (child.type === "GIhA") {
            sumtiCounter = bridiTailStartSumtiCounter;
        }

        if (child.type === "FA") {
            sumtiCounter = placeTagToPlace(child);
        }
        
        if (child.type === "BAI" || child.type === "FIhO" || child.type === "PU") {
            nextIsModal = true;
        }
        
        if (child.type === "sumti") {
            if (nextIsModal) {
                child.type = "modal sumti";
                nextIsModal = false;
            } else {
                child.type = "sumti x";
                child.sumtiPlace = sumtiCounter;
                sumtiCounter++;
            }
        }
        
        if (child.type === "selbri" && sumtiCounter === 1) {
            sumtiCounter++;
        }
    }
}

function placeTagToPlace(tag) {
    if (tag.word === "fa") {
        return 1;
    } else if (tag.word === "fe") {
        return 2;
    } else if (tag.word === "fi") {
        return 3;
    } else if (tag.word === "fo") {
        return 4;
    } else if (tag.word === "fu") {
        return 5;
    } else if (tag.word === "fai") {
        return "fai";
        /* Ilmen: Yeah that's an ugly lazy handling of "fai", but a cleaner 
         * handling will require more work. */
    }
}

exports.numberSumti = numberSumti
exports.removeMorphology = removeMorphology
exports.removeSpaces = removeSpaces
exports.simplifyTree = simplifyTree
exports.among = among
exports.numberSumti = numberSumti