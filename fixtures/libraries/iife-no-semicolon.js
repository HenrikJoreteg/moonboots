/*jshint asi:true, browser:true, unused:false*/
(function () {
    if (typeof window !== 'undefined') {
        window.BadLib = function (foo) {
            if (this.baz && this.baz === foo) {
                this.console.log('baz is', foo)
            }
        };
    }
})()