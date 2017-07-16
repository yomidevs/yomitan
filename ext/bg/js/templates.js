(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['dictionary.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "checked";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"dict-group well well-sm\" data-title=\""
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">\n    <h4><span class=\"text-muted glyphicon glyphicon-book\"></span> "
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + " <small>rev."
    + alias4(((helper = (helper = helpers.revision || (depth0 != null ? depth0.revision : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"revision","hash":{},"data":data}) : helper)))
    + "</small></h4>\n\n    <div class=\"checkbox\">\n        <label><input type=\"checkbox\" class=\"dict-enabled\" "
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.enabled : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "> Enable search</label>\n    </div>\n    <div class=\"form-group options-advanced\">\n        <label for=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\">Result priority</label>\n        <input type=\"number\" value=\""
    + alias4(((helper = (helper = helpers.priority || (depth0 != null ? depth0.priority : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"priority","hash":{},"data":data}) : helper)))
    + "\" id=\"dict-"
    + alias4(((helper = (helper = helpers.title || (depth0 != null ? depth0.title : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data}) : helper)))
    + "\" class=\"form-control dict-priority\">\n    </div>\n</div>\n";
},"useData":true});
templates['fields.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.program(15, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.brief : depth0),{"name":"unless","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(8, data, 0),"inverse":container.program(12, data, 0),"data":data})) != null ? stack1 : "");
},"3":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<i>("
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ")</i> ";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return container.escapeExpression(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + ((stack1 = helpers.unless.call(alias1,(data && data.last),{"name":"unless","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"6":function(container,depth0,helpers,partials,data) {
    return ", ";
},"8":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<ul>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>";
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "<li>";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</li>";
},"10":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = "";

  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer;
},"13":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers.unless.call(alias1,(depth0 != null ? depth0.brief : depth0),{"name":"unless","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(19, data, 0),"inverse":container.program(13, data, 0),"data":data})) != null ? stack1 : "");
},"16":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"17":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "("
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ") ";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"20":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(depth0, depth0))
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data) {
    return "";
},"24":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.character : stack1), depth0));
},"26":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.dictionary : stack1), depth0));
},"28":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.modeTermKana : depth0),{"name":"if","hash":{},"fn":container.program(29, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "");
},"29":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1),{"name":"if","hash":{},"fn":container.program(30, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "");
},"30":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1), depth0));
},"32":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.expression : stack1), depth0));
},"34":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(35, data, 0),"inverse":container.program(38, data, 0),"data":data})) != null ? stack1 : "");
},"35":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1),{"name":"if","hash":{},"fn":container.program(36, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "");
},"36":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "<ruby>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.expression : stack1), depth0))
    + "<rt>"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1), depth0))
    + "</rt></ruby>";
},"38":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1),{"name":"if","hash":{},"fn":container.program(39, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "");
},"39":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.expression : stack1), depth0))
    + " ["
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.reading : stack1), depth0))
    + "]";
},"41":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(42, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.modeKanji : depth0),{"name":"if","hash":{},"fn":container.program(44, data, 0, blockParams, depths),"inverse":container.program(53, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(66, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"42":function(container,depth0,helpers,partials,data) {
    return "<div style=\"text-align: left;\">";
},"44":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.glossary : stack1)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(45, data, 0),"inverse":container.program(51, data, 0),"data":data})) != null ? stack1 : "");
},"45":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(46, data, 0),"inverse":container.program(49, data, 0),"data":data})) != null ? stack1 : "");
},"46":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<ol>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.glossary : stack1),{"name":"each","hash":{},"fn":container.program(47, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ol>";
},"47":function(container,depth0,helpers,partials,data) {
    return "<li>"
    + container.escapeExpression(container.lambda(depth0, depth0))
    + "</li>";
},"49":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.glossary : stack1),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"51":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.glossary : stack1)) != null ? stack1["0"] : stack1), depth0));
},"53":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.group : depth0),{"name":"if","hash":{},"fn":container.program(54, data, 0, blockParams, depths),"inverse":container.program(64, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"54":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.definitions : stack1)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(55, data, 0, blockParams, depths),"inverse":container.program(62, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"55":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(56, data, 0, blockParams, depths),"inverse":container.program(59, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"56":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "<ol>"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.definitions : stack1),{"name":"each","hash":{},"fn":container.program(57, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ol>";
},"57":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "<li>"
    + ((stack1 = container.invokePartial(partials["glossary-single"],depth0,{"name":"glossary-single","hash":{"brief":(depths[1] != null ? depths[1].brief : depths[1]),"html":(depths[1] != null ? depths[1].html : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>";
},"59":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.definitions : stack1),{"name":"each","hash":{},"fn":container.program(60, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"60":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return " * "
    + ((stack1 = container.invokePartial(partials["glossary-single"],depth0,{"name":"glossary-single","hash":{"brief":(depths[1] != null ? depths[1].brief : depths[1]),"html":(depths[1] != null ? depths[1].html : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"62":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials["glossary-single"],((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.definitions : stack1)) != null ? stack1["0"] : stack1),{"name":"glossary-single","hash":{"brief":(depth0 != null ? depth0.brief : depth0),"html":(depth0 != null ? depth0.html : depth0)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"64":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials["glossary-single"],(depth0 != null ? depth0.definition : depth0),{"name":"glossary-single","hash":{"brief":(depth0 != null ? depth0.brief : depth0),"html":(depth0 != null ? depth0.html : depth0)},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"66":function(container,depth0,helpers,partials,data) {
    return "</div>";
},"68":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.glossary,depth0,{"name":"glossary","hash":{"brief":true},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"70":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.kunyomi : stack1),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"72":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.onyomi : stack1),{"name":"each","hash":{},"fn":container.program(20, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"74":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.modeTermKana : depth0),{"name":"unless","hash":{},"fn":container.program(30, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"76":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1),{"name":"if","hash":{},"fn":container.program(77, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"77":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1)) != null ? stack1.sentence : stack1), depth0));
},"79":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1),{"name":"if","hash":{},"fn":container.program(80, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"80":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1)) != null ? stack1.prefix : stack1), depth0));
},"82":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1),{"name":"if","hash":{},"fn":container.program(83, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"83":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1)) != null ? stack1.body : stack1), depth0));
},"85":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1),{"name":"if","hash":{},"fn":container.program(86, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"86":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = ((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.cloze : stack1)) != null ? stack1.suffix : stack1), depth0));
},"88":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.tags : stack1),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"90":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.html : depth0),{"name":"if","hash":{},"fn":container.program(91, data, 0),"inverse":container.program(93, data, 0),"data":data})) != null ? stack1 : "");
},"91":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=container.lambda, alias2=container.escapeExpression;

  return "<a href=\""
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.url : stack1), depth0))
    + "\">"
    + alias2(alias1(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.url : stack1), depth0))
    + "</a>";
},"93":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.definition : depth0)) != null ? stack1.url : stack1), depth0));
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n"
    + ((stack1 = container.invokePartial(helpers.lookup.call(depth0 != null ? depth0 : {},depth0,"marker",{"name":"lookup","hash":{},"data":data}),depth0,{"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["glossary-single"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"args":["audio"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(24, data, 0, blockParams, depths),"inverse":container.noop,"args":["character"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(26, data, 0, blockParams, depths),"inverse":container.noop,"args":["dictionary"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(28, data, 0, blockParams, depths),"inverse":container.noop,"args":["expression"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(34, data, 0, blockParams, depths),"inverse":container.noop,"args":["furigana"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(41, data, 0, blockParams, depths),"inverse":container.noop,"args":["glossary"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(68, data, 0, blockParams, depths),"inverse":container.noop,"args":["glossary-brief"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(70, data, 0, blockParams, depths),"inverse":container.noop,"args":["kunyomi"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(72, data, 0, blockParams, depths),"inverse":container.noop,"args":["onyomi"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(74, data, 0, blockParams, depths),"inverse":container.noop,"args":["reading"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(76, data, 0, blockParams, depths),"inverse":container.noop,"args":["sentence"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(79, data, 0, blockParams, depths),"inverse":container.noop,"args":["cloze-prefix"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(82, data, 0, blockParams, depths),"inverse":container.noop,"args":["cloze-body"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(85, data, 0, blockParams, depths),"inverse":container.noop,"args":["cloze-suffix"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(88, data, 0, blockParams, depths),"inverse":container.noop,"args":["tags"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(90, data, 0, blockParams, depths),"inverse":container.noop,"args":["url"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['kanji.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<div class=\"entry\" data-type=\"kanji\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.source : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n    <div class=\"glyph\">"
    + container.escapeExpression(((helper = (helper = helpers.character || (depth0 != null ? depth0.character : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"character","hash":{},"data":data}) : helper)))
    + "</div>\n\n    <div class=\"reading\">\n        <table>\n            <tr>\n                <th>Kunyomi:</th>\n                <td>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.kunyomi : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </td>\n            </tr>\n            <tr>\n                <th>Onyomi:</th>\n                <td>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.onyomi : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "                </td>\n            </tr>\n        </table>\n    </div>\n\n    <div>\n"
    + ((stack1 = helpers.each.call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(9, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n\n    <div class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(11, data, 0),"inverse":container.program(15, data, 0),"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"2":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"kanji\"><img src=\"/mixed/img/add-kanji.png\" title=\"Add Kanji (Alt + K)\" alt></a>\n";
},"4":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"source-term\"><img src=\"/mixed/img/source-term.png\" title=\"Source term (Alt + B)\" alt></a>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "                    "
    + container.escapeExpression(container.lambda(depth0, depth0))
    + ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.last),{"name":"unless","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n";
},"7":function(container,depth0,helpers,partials,data) {
    return ", ";
},"9":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "        <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"11":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <ol>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(12, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        </ol>\n";
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "            <li><span class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"15":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "        <div class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(16, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"16":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"18":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(19, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"19":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"21":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(22, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"22":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.first),{"name":"unless","hash":{},"fn":container.program(23, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.kanji,depth0,{"name":"kanji","hash":{"root":(depths[1] != null ? depths[1].root : depths[1]),"source":(depths[1] != null ? depths[1].source : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"23":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"25":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found.</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(21, data, 0, blockParams, depths),"inverse":container.program(25, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["kanji"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
templates['model.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    return "                    <li><a class=\"marker-link\" href=\"#\">"
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
templates['terms.html'] = template({"1":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.tags : depth0),{"name":"if","hash":{},"fn":container.program(2, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["1"] : stack1),{"name":"if","hash":{},"fn":container.program(5, data, 0),"inverse":container.program(9, data, 0),"data":data})) != null ? stack1 : "");
},"2":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<div>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.tags : depth0),{"name":"each","hash":{},"fn":container.program(3, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"3":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "    <span class=\"label label-default tag-"
    + alias4(((helper = (helper = helpers.category || (depth0 != null ? depth0.category : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"category","hash":{},"data":data}) : helper)))
    + "\" title=\""
    + alias4(((helper = (helper = helpers.notes || (depth0 != null ? depth0.notes : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"notes","hash":{},"data":data}) : helper)))
    + "\">"
    + alias4(((helper = (helper = helpers.name || (depth0 != null ? depth0.name : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"name","hash":{},"data":data}) : helper)))
    + "</span>\n";
},"5":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "<ul>\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.glossary : depth0),{"name":"each","hash":{},"fn":container.program(6, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</ul>\n";
},"6":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <li><span class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(7, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</span></li>\n";
},"7":function(container,depth0,helpers,partials,data) {
    return container.escapeExpression(container.lambda(depth0, depth0));
},"9":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "<div class=\"glossary-item\">";
  stack1 = ((helper = (helper = helpers.multiLine || (depth0 != null ? depth0.multiLine : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"multiLine","hash":{},"fn":container.program(10, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.multiLine) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"10":function(container,depth0,helpers,partials,data) {
    var stack1;

  return container.escapeExpression(container.lambda(((stack1 = (depth0 != null ? depth0.glossary : depth0)) != null ? stack1["0"] : stack1), depth0));
},"12":function(container,depth0,helpers,partials,data) {
    var stack1, alias1=depth0 != null ? depth0 : {};

  return "<div class=\"entry\" data-type=\"term\">\n    <div class=\"actions\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.addable : depth0),{"name":"if","hash":{},"fn":container.program(13, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.playback : depth0),{"name":"if","hash":{},"fn":container.program(15, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "        <img src=\"/mixed/img/entry-current.png\" class=\"current\" title=\"Current entry (Alt + Up/Down/Home/End/PgUp/PgDn)\" alt>\n    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reading : depth0),{"name":"if","hash":{},"fn":container.program(17, data, 0),"inverse":container.program(20, data, 0),"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.reasons : depth0),{"name":"if","hash":{},"fn":container.program(22, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n    <div class=\"glossary\">\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.grouped : depth0),{"name":"if","hash":{},"fn":container.program(26, data, 0),"inverse":container.program(32, data, 0),"data":data})) != null ? stack1 : "")
    + "    </div>\n\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.debug : depth0),{"name":"if","hash":{},"fn":container.program(34, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "</div>\n";
},"13":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-view-note pending disabled\"><img src=\"/mixed/img/view-note.png\" title=\"View added note (Alt + V)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kanji\"><img src=\"/mixed/img/add-term-kanji.png\" title=\"Add expression (Alt + E)\" alt></a>\n        <a href=\"#\" class=\"action-add-note pending disabled\" data-mode=\"term-kana\"><img src=\"/mixed/img/add-term-kana.png\" title=\"Add reading (Alt + R)\" alt></a>\n";
},"15":function(container,depth0,helpers,partials,data) {
    return "        <a href=\"#\" class=\"action-play-audio\"><img src=\"/mixed/img/play-audio.png\" title=\"Play audio (Alt + P)\" alt></a>\n";
},"17":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", buffer = 
  "    <div class=\"expression\"><ruby>";
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
  "    <div class=\"expression\">";
  stack1 = ((helper = (helper = helpers.kanjiLinks || (depth0 != null ? depth0.kanjiLinks : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"kanjiLinks","hash":{},"fn":container.program(18, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.kanjiLinks) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</div>\n";
},"22":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "    <div class=\"reasons\">\n"
    + ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.reasons : depth0),{"name":"each","hash":{},"fn":container.program(23, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "    </div>\n";
},"23":function(container,depth0,helpers,partials,data) {
    var stack1;

  return "        <span class=\"reasons\">"
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

  return "            <li>"
    + ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "")
    + "</li>\n";
},"30":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,((stack1 = (depth0 != null ? depth0.definitions : depth0)) != null ? stack1["0"] : stack1),{"name":"definition","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"32":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.invokePartial(partials.definition,depth0,{"name":"definition","data":data,"indent":"        ","helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"34":function(container,depth0,helpers,partials,data) {
    var stack1, helper, options, buffer = 
  "    <pre>";
  stack1 = ((helper = (helper = helpers.dumpObject || (depth0 != null ? depth0.dumpObject : depth0)) != null ? helper : helpers.helperMissing),(options={"name":"dumpObject","hash":{},"fn":container.program(35, data, 0),"inverse":container.noop,"data":data}),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},options) : helper));
  if (!helpers.dumpObject) { stack1 = helpers.blockHelperMissing.call(depth0,stack1,options)}
  if (stack1 != null) { buffer += stack1; }
  return buffer + "</pre>\n";
},"35":function(container,depth0,helpers,partials,data) {
    var stack1;

  return ((stack1 = container.lambda(depth0, depth0)) != null ? stack1 : "");
},"37":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.each.call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"each","hash":{},"fn":container.program(38, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "");
},"38":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return ((stack1 = helpers.unless.call(depth0 != null ? depth0 : {},(data && data.first),{"name":"unless","hash":{},"fn":container.program(39, data, 0, blockParams, depths),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "\n"
    + ((stack1 = container.invokePartial(partials.term,depth0,{"name":"term","hash":{"playback":(depths[1] != null ? depths[1].playback : depths[1]),"addable":(depths[1] != null ? depths[1].addable : depths[1]),"grouped":(depths[1] != null ? depths[1].grouped : depths[1]),"debug":(depths[1] != null ? depths[1].debug : depths[1])},"data":data,"helpers":helpers,"partials":partials,"decorators":container.decorators})) != null ? stack1 : "");
},"39":function(container,depth0,helpers,partials,data) {
    return "<hr>";
},"41":function(container,depth0,helpers,partials,data) {
    return "<p class=\"note\">No results found.</p>\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data,blockParams,depths) {
    var stack1;

  return "\n\n"
    + ((stack1 = helpers["if"].call(depth0 != null ? depth0 : {},(depth0 != null ? depth0.definitions : depth0),{"name":"if","hash":{},"fn":container.program(37, data, 0, blockParams, depths),"inverse":container.program(41, data, 0, blockParams, depths),"data":data})) != null ? stack1 : "");
},"main_d":  function(fn, props, container, depth0, data, blockParams, depths) {

  var decorators = container.decorators;

  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(1, data, 0, blockParams, depths),"inverse":container.noop,"args":["definition"],"data":data}) || fn;
  fn = decorators.inline(fn,props,container,{"name":"inline","hash":{},"fn":container.program(12, data, 0, blockParams, depths),"inverse":container.noop,"args":["term"],"data":data}) || fn;
  return fn;
  }

,"useDecorators":true,"usePartial":true,"useData":true,"useDepths":true});
})();