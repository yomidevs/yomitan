(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
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
})();