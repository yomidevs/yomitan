(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['dictionary.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "disabled";
},"3":function(container,depth0,helpers,partials,data) {
    return "checked";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"dict-group well well-sm\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">\n    <h4><span class=\"text-muted glyphicon glyphicon-book\"></span> "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + " <small>rev."
    + alias4(((helper = (helper = helpers.revision || (depth0 != null ? depth0.revision : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"revision","hash":{},"data":data}) : helper)))
    + "</small></h4>\n\n    <!-- <div class=\"row\"> -->\n    <!--     <div class=\"col-xs-8\"> -->\n    <!--         <h4><span class=\"text-muted glyphicon glyphicon-book\"></span> "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + " <small>v."
    + alias4(((helper = (helper = helpers.version || (depth0 != null ? depth0.version : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"version","hash":{},"data":data}) : helper)))
    + "</small></h4> -->\n    <!--     </div> -->\n    <!--     <div class=\"col-xs-4 text-right disabled\"> -->\n    <!--         <button type=\"button\" class=\"dict-group-controls dict-delete btn btn-danger\">Delete</button> -->\n    <!--     </div> -->\n    <!-- </div> -->\n\n    <div class=\"dict-delete-progress\">\n        Dictionary data is being deleted, please be patient...\n        <div class=\"progress\">\n            <div class=\"progress-bar progress-bar-striped progress-bar-danger\" style=\"width: 0%\"></div>\n        </div>\n    </div>\n\n    <div class=\"checkbox dict-group-controls "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.hasTerms : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">\n        <label><input type=\"checkbox\" class=\"dict-enable-terms\" "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.hasTerms : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.enableTerms : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Enable term search</label>\n    </div>\n    <div class=\"checkbox dict-group-controls "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.hasKanji : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\">\n        <label><input type=\"checkbox\" class=\"dict-enable-kanji\" "
    + ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.hasKanji : depth0),{"name":"unless","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + " "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.enableKanji : depth0),{"name":"if","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Enable Kanji search</label>\n    </div>\n</div>\n";
},"useData":true});
templates['kanji-list.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<div class=\"kanji-definition\">\n    <div class=\"action-bar\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n\n    <div class=\"kanji-glyph\">"
    + container.escapeExpression(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n    <div class=\"kanji-reading\">\n        <table>\n            <tr>\n                <th>Kunyomi:</th>\n                <td>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.kunyomi : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </td>\n            </tr>\n            <tr>\n                <th>Onyomi:</th>\n                <td>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.onyomi : depth0),{"name":"each","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </td>\n            </tr>\n        </table>\n    </div>\n\n    <div class=\"kanji-tags\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n\n    <div class=\"kanji-glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(9, data, 0),"inverse":container.program(13, data, 0),"data":data})) != null ? stack1 : "")
    + "    </div>\n</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    var helper;

  return "            <a href=\"#\" title=\"Add Kanji\" class=\"action-add-note pending disabled\" data-mode=\"kanji\" data-index=\""
    + container.escapeExpression(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><img src=\"img/add_kanji.png\"></a>\n";
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                        "
    + container.escapeExpression(container.lambda(depth0, depth0))
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"5":function(container,depth0,helpers,partials,data) {
    return ", ";
},"7":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <span class=\"tag tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "            <ol \"kanji-glossary-group\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "            </ol>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "                    <li><span class=\"kanji-glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(11, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"11":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"13":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "            <div class=\"kanji-glossary-group kanji-glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(14, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"14":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"16":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(17, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "        "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.first),{"name":"unless","hash":{},"fn":container.program(18, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.kanji,depth0,{"name":"kanji","hash":{"root":(depths[1] != null ? depths[1].root : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1])},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"18":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"20":function(container,depth0,helpers,partials,data) {
    return "    <p>No results found</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(16, data, 0, blockParams, depths),"inverse":container.program(20, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["kanji"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['model.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "                        <li><a class=\"marker-link\" href=\"#\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</a></li>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<tr>\n    <td class=\"col-sm-2\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</td>\n    <td class=\"col-sm-10\">\n        <div class=\"input-group\">\n            <input type=\"text\" class=\"anki-field-value form-control\" data-field=\""
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "\" value=\""
    + alias4(((helper = (helper = helpers.value || (depth0 != null ? depth0.value : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"value","hash":{},"data":data}) : helper)))
    + "\">\n            <div class=\"input-group-btn\">\n                <button type=\"button\" class=\"btn btn-default dropdown-toggle\" data-toggle=\"dropdown\">\n                    <span class=\"caret\"></span>\n                </button>\n                <ul class=\"dropdown-menu dropdown-menu-right\">\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.markers : depth0),{"name":"each","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </ul>\n            </div>\n        </div>\n    </td>\n</tr>\n";
},"useData":true});
templates['term-list.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(9, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <div class=\"term-tags\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "                <span class=\"tag tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <ul class=\"term-glossary-group\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ul>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "            <li><span class=\"term-glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"7":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <div class=\"term-glossary-group term-glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<div class=\"term-definition\">\n    <div class=\"action-bar\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.playback : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reading : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0),"inverse":container.program(20, data, 0),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reasons : depth0),{"name":"if","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"term-glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.grouped : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "")
    + "    </div>\n</div>\n";
},"13":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "            <a href=\"#\" title=\"Add term as expression\" class=\"action-add-note pending disabled\" data-mode=\"term_kanji\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><img src=\"img/add_term_kanji.png\"></a>\n            <a href=\"#\" title=\"Add term as reading\" class=\"action-add-note pending disabled\" data-mode=\"term_kana\" data-index=\""
    + alias4(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><img src=\"img/add_term_kana.png\"></a>\n";
},"15":function(container,depth0,helpers,partials,data) {
    var helper;

  return "            <a href=\"#\" title=\"Play audio\" class=\"action-play-audio\" data-index=\""
    + container.escapeExpression(((helper = (helper = helpers.index || (data && data.index)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"index","hash":{},"data":data}) : helper)))
    + "\"><img src=\"img/play_audio.png\"></a>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", buffer = 
  "        <div class=\"term-expression\"><ruby>";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : alias2),(options={"name":"kanjiLinks","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data}),(typeof helper === alias3 ? helper.call(alias1,options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "<rt>"
    + container.escapeExpression(((helper = (helper = helpers.reading || (depth0 != null ? depth0.reading : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"reading","hash":{},"data":data}) : helper)))
    + "</rt></ruby></div>\n";
},"18":function(container,depth0,helpers,partials,data) {
    var helper;

  return container.escapeExpression(((helper = (helper = helpers.expression || (depth0 != null ? depth0.expression : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"expression","hash":{},"data":data}) : helper)));
},"20":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "        <div class=\"term-expression\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"kanjiLinks","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <div class=\"term-reasons\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.reasons : depth0),{"name":"each","hash":{},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </div>\n";
},"23":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <span class=\"reasons\">"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</span> "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(24, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"24":function(container,depth0,helpers,partials,data) {
    return "&laquo;";
},"26":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(27, data, 0),"inverse":container.program(30, data, 0),"data":data})) != null ? stack1 : "");
},"27":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <ol>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(28, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ol>\n";
},"28":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                <li>"
    + ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>\n";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["0"] : stack1),{"name":"definition","data":data,"indent":"            ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"32":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"34":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(35, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "        "
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.first),{"name":"unless","hash":{},"fn":container.program(36, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"playback":(depths[1] != null ? depths[1].playback : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"grouped":(depths[1] != null ? depths[1].grouped : depths[1])},"data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"36":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"38":function(container,depth0,helpers,partials,data) {
    return "    <p>No results found</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.program(38, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["definition"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(12, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();