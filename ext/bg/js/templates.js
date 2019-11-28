(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['kanji.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(8, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<table class=\"info-output\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.data : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</table>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <tr>\n        <th>"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.notes : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(6, data, 0),"data":data})) != null ? stack1 : "")
    + "</th>\n        <td>"
    + container.escapeExpression(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "</td>\n    </tr>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"notes","hash":{},"data":data}) : helper)));
},"6":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"name","hash":{},"data":data}) : helper)));
},"8":function(container,depth0,helpers,partials,data) {
    return "No data found\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"kanji\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/mixed/img/entry-current.svg\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n    <div class=\"glyph expression-scan-toggle\">"
    + container.escapeExpression(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <table class=\"table table-condensed glyph-data\">\n        <tr>\n            <th>Glossary</th>\n            <th>Readings</th>\n            <th>Statistics</th>\n        </tr>\n        <tr>\n            <td class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.program(22, data, 0),"data":data})) != null ? stack1 : "")
    + "            </td>\n            <td class=\"reading\">\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.onyomi : depth0),{"name":"if","hash":{},"fn":container.program(24, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n                "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.kunyomi : depth0),{"name":"if","hash":{},"fn":container.program(27, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n            </td>\n            <td>"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.misc : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Classifications</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1["class"] : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Codepoints</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.code : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n        <tr>\n            <th colspan=\"3\">Dictionary Indices</th>\n        </tr>\n        <tr>\n            <td colspan=\"3\">"
    + ((stack1 = container.invokePartial(partials.table,depth0,{"name":"table","hash":{"data":((stack1 = (depth0 != null ? depth0.stats : depth0)) != null ? stack1.index : stack1)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</td>\n        </tr>\n    </table>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(29, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"11":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/mixed/img/view-note.svg\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"kanji\"><img src=\"/mixed/img/add-term-kanji.svg\" title=\"Add Kanji (Alt + K)\" alt></a>\n";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <ol>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ol>\n";
},"20":function(container,depth0,helpers,partials,data) {
    return "<li><span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span></li>";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <span class=\"glossary-item\">"
    + container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0))
    + "</span>\n";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.onyomi : depth0),{"name":"each","hash":{},"fn":container.program(25, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"25":function(container,depth0,helpers,partials,data) {
    return "<dd>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</dd>";
},"27":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<dl>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.kunyomi : depth0),{"name":"each","hash":{},"fn":container.program(25, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</dl>";
},"29":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"32":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"term-navigation\">\n    <a href=\"#\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.source : depth0),{"name":"if","hash":{},"fn":container.program(33, data, 0, blockParams, depths),"inverse":container.program(35, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "><img src=\"/mixed/img/source-term.svg\" title=\"Source term (Alt + B)\" alt></a>\n    <a href=\"#\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.history : depth0),{"name":"if","hash":{},"fn":container.program(37, data, 0, blockParams, depths),"inverse":container.program(39, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "><img src=\"/mixed/img/source-term.svg\" style=\"transform: scaleX(-1);\" title=\"History term (Alt + F)\" alt></a>\n</div>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(41, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"33":function(container,depth0,helpers,partials,data) {
    return "class=\"source-term\"";
},"35":function(container,depth0,helpers,partials,data) {
    return "class=\"source-term term-button-fade\"";
},"37":function(container,depth0,helpers,partials,data) {
    return "class=\"history-term\"";
},"39":function(container,depth0,helpers,partials,data) {
    return "class=\"history-term term-button-fade\"";
},"41":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(42, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.kanji,depth0,{"name":"kanji","hash":{"root":(depths[1] != null ? depths[1].root : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"42":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"44":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(32, data, 0, blockParams, depths),"inverse":container.program(44, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["table"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(10, data, 0, blockParams, depths),"inverse":container.noop,"args":["kanji"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['query-parser.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.preview : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(4, data, 0),"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.each.call(alias1,depth0,{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</span>";
},"2":function(container,depth0,helpers,partials,data) {
    return "<span class=\"query-parser-term-preview\">";
},"4":function(container,depth0,helpers,partials,data) {
    return "<span class=\"query-parser-term\">";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.part,depth0,{"name":"part","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.raw : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(12, data, 0),"data":data})) != null ? stack1 : "");
},"9":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.text : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"10":function(container,depth0,helpers,partials,data) {
    return "<span class=\"query-parser-char\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span>";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<ruby>"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.text : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<rt>"
    + container.escapeExpression(((helper = (helper = helpers.reading || (depth0 != null ? depth0.reading : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"reading","hash":{},"data":data}) : helper)))
    + "</rt></ruby>";
},"14":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"preview":(depths[1] != null ? depths[1].preview : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.terms : depth0),{"name":"each","hash":{},"fn":container.program(14, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(8, data, 0, blockParams, depths),"inverse":container.noop,"args":["part"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['terms.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "<div class=\"dict-";
  stack1 = ((helper = (helper = helpers.sanitizeCssClass || (depth0 != null ? depth0.sanitizeCssClass : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"sanitizeCssClass","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.sanitizeCssClass) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.program(19, data, 0),"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"dictionary","hash":{},"data":data}) : helper)));
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.definitionTags : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"5":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-info\"";
},"7":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <div "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n        ("
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.only : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        only)\n    </div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"11":function(container,depth0,helpers,partials,data) {
    return ", ";
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "    <ul "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </ul>\n";
},"14":function(container,depth0,helpers,partials,data) {
    return "class=\"compact-glossary\"";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "        <li><span class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"17":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"19":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "    <div class=\"glossary-item "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.compactGlossaries : depth0),{"name":"if","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"20":function(container,depth0,helpers,partials,data) {
    return "compact-glossary";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"24":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"entry\" data-type=\"term\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(25, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"unless","hash":{},"fn":container.program(27, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/mixed/img/entry-current.svg\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(30, data, 0, blockParams, depths),"inverse":container.program(45, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reasons : depth0),{"name":"if","hash":{},"fn":container.program(48, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(52, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.grouped : depth0),{"name":"if","hash":{},"fn":container.program(55, data, 0, blockParams, depths),"inverse":container.program(61, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(64, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"25":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/mixed/img/view-note.svg\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kanji\"><img src=\"/mixed/img/add-term-kanji.svg\" title=\"Add expression (Alt + E)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kana\"><img src=\"/mixed/img/add-term-kana.svg\" title=\"Add reading (Alt + R)\" alt></a>\n";
},"27":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.playback : depth0),{"name":"if","hash":{},"fn":container.program(28, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"28":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-play-audio\"><img src=\"/mixed/img/play-audio.svg\" title=\"Play audio (Alt + P)\" alt></a>\n";
},"30":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.expressions : depth0),{"name":"each","hash":{},"fn":container.program(31, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"31":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", buffer = 
  "<div class=\"expression expression-scan-toggle\"><span class=\"expression-"
    + container.escapeExpression(((helper = (helper = helpers.termFrequency || (depth0 != null ? depth0.termFrequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"termFrequency","hash":{},"data":data}) : helper)))
    + "\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : alias2),(options={"name":"kanjiLinks","hash":{},"fn":container.program(32, data, 0, blockParams, depths),"inverse":container.noop,"data":data}),(typeof helper === alias3 ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span><div class=\"peek-wrapper\">"
    + ((stack1 = helpers["if"].call(alias1,(depths[1] != null ? depths[1].playback : depths[1]),{"name":"if","hash":{},"fn":container.program(35, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(37, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.frequencies : depth0),{"name":"if","hash":{},"fn":container.program(40, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div><span class=\""
    + ((stack1 = helpers["if"].call(alias1,(data && data.last),{"name":"if","hash":{},"fn":container.program(43, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">、</span></div>";
},"32":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options;

  stack1 = ((helper = (helper = helpers.furigana || (depth0 != null ? depth0.furigana : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"furigana","hash":{},"fn":container.program(33, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.furigana) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { return stack1; }
  else { return ''; }
},"33":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data) {
    return "<a href=\"#\" class=\"action-play-audio\"><img src=\"/mixed/img/play-audio.svg\" title=\"Play audio\" alt></a>";
},"37":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"tags\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(38, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"38":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"40":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div class=\"frequencies\">"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(41, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>";
},"41":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"43":function(container,depth0,helpers,partials,data) {
    return "invisible";
},"45":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : (container.nullContext || {}), buffer = 
  "    <div class=\"expression expression-scan-toggle\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"kanjiLinks","hash":{},"fn":container.program(32, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.termTags : depth0),{"name":"if","hash":{},"fn":container.program(46, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"46":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div style=\"display: inline-block;\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.termTags : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"48":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div class=\"reasons\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.reasons : depth0),{"name":"each","hash":{},"fn":container.program(49, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"49":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <span class=\"reasons\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span> "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.last),{"name":"unless","hash":{},"fn":container.program(50, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"50":function(container,depth0,helpers,partials,data) {
    return "&laquo;";
},"52":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.frequencies : depth0),{"name":"each","hash":{},"fn":container.program(53, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"53":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-frequency\">"
    + alias4(((helper = (helper = helpers.dictionary || (depth0 != null ? depth0.dictionary : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"dictionary","hash":{},"data":data}) : helper)))
    + ":"
    + alias4(((helper = (helper = helpers.frequency || (depth0 != null ? depth0.frequency : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"frequency","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"55":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(56, data, 0, blockParams, depths),"inverse":container.program(59, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"56":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "        <ol>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(57, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ol>\n";
},"57":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "            <li>"
    + ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>\n";
},"59":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["0"] : stack1),{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"61":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.merged : depth0),{"name":"if","hash":{},"fn":container.program(55, data, 0, blockParams, depths),"inverse":container.program(62, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"62":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","hash":{"compactGlossaries":(depth0 != null ? depth0.compactGlossaries : depth0)},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "        ";
},"64":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(33, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"66":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : (container.nullContext || {});

  return "<div class=\"term-navigation\">\n    <a href=\"#\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.source : depth0),{"name":"if","hash":{},"fn":container.program(67, data, 0, blockParams, depths),"inverse":container.program(69, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "><img src=\"/mixed/img/source-term.svg\" title=\"Source term (Alt + B)\" alt></a>\n    <a href=\"#\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.history : depth0),{"name":"if","hash":{},"fn":container.program(71, data, 0, blockParams, depths),"inverse":container.program(73, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + "><img src=\"/mixed/img/source-term.svg\" style=\"transform: scaleX(-1);\" title=\"History term (Alt + F)\" alt></a>\n</div>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(75, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"67":function(container,depth0,helpers,partials,data) {
    return "class=\"source-term\"";
},"69":function(container,depth0,helpers,partials,data) {
    return "class=\"source-term term-button-fade\"";
},"71":function(container,depth0,helpers,partials,data) {
    return "class=\"history-term\"";
},"73":function(container,depth0,helpers,partials,data) {
    return "class=\"history-term term-button-fade\"";
},"75":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : (container.nullContext || {}),(data && data.first),{"name":"unless","hash":{},"fn":container.program(76, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"compactGlossaries":(depths[1] != null ? depths[1].compactGlossaries : depths[1]),"playback":(depths[1] != null ? depths[1].playback : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"merged":(depths[1] != null ? depths[1].merged : depths[1]),"grouped":(depths[1] != null ? depths[1].grouped : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"76":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"78":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found.</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(66, data, 0, blockParams, depths),"inverse":container.program(78, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["definition"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(24, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();