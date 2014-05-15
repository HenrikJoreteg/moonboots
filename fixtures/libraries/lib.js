/*jshint asi:true, browser:true, unused:false*/
(function () {
    if (typeof window !== 'undefined') {
        window.Lib = function (bar) {
            if (this.biz && this.biz === bar) {
                this.console.log('biz is', bar);
            }
        };
    }
})();