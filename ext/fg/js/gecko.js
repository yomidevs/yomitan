if (!document.caretRangeFromPoint){
    document.caretRangeFromPoint = function polyfillcaretRangeFromPoint(x,y){
        let range = document.createRange();
        let position = document.caretPositionFromPoint(x,y);
        if (!position) {
            return null;
        }
        range.setStart(position.offsetNode, position.offset);
        range.setEnd(position.offsetNode, position.offset);
        return range;
    };
}
