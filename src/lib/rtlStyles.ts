// Pembalik tata letak untuk bahasa tulis kanan-ke-kiri (ar, he, fa, ur).
// Dibuat otomatis: class Tailwind fisik (ml-/mr-/pl-/pr-/left-/right-/text-left/border-l/...) dibalik
// hanya saat <html dir="rtl">. Bahasa lain tidak terpengaruh sama sekali.
const RTL_CSS = `
html[dir="rtl"] .border-l-\\[4px\\]{border-left-width:0;border-right-width:4px}
html[dir="rtl"] .left-0:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0px}
html[dir="rtl"] .left-0\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.125rem}
html[dir="rtl"] .left-1:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.25rem}
html[dir="rtl"] .left-1\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.375rem}
html[dir="rtl"] .left-10:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:2.5rem}
html[dir="rtl"] .left-11:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:2.75rem}
html[dir="rtl"] .left-12:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:3rem}
html[dir="rtl"] .left-14:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:3.5rem}
html[dir="rtl"] .left-16:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:4rem}
html[dir="rtl"] .left-2:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.5rem}
html[dir="rtl"] .left-2\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.625rem}
html[dir="rtl"] .left-20:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:5rem}
html[dir="rtl"] .left-24:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:6rem}
html[dir="rtl"] .left-28:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:7rem}
html[dir="rtl"] .left-3:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.75rem}
html[dir="rtl"] .left-3\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:0.875rem}
html[dir="rtl"] .left-32:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:8rem}
html[dir="rtl"] .left-36:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:9rem}
html[dir="rtl"] .left-4:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:1rem}
html[dir="rtl"] .left-40:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:10rem}
html[dir="rtl"] .left-44:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:11rem}
html[dir="rtl"] .left-48:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:12rem}
html[dir="rtl"] .left-5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:1.25rem}
html[dir="rtl"] .left-52:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:13rem}
html[dir="rtl"] .left-56:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:14rem}
html[dir="rtl"] .left-6:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:1.5rem}
html[dir="rtl"] .left-60:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:15rem}
html[dir="rtl"] .left-64:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:16rem}
html[dir="rtl"] .left-7:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:1.75rem}
html[dir="rtl"] .left-72:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:18rem}
html[dir="rtl"] .left-8:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:2rem}
html[dir="rtl"] .left-80:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:20rem}
html[dir="rtl"] .left-9:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:2.25rem}
html[dir="rtl"] .left-96:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:24rem}
html[dir="rtl"] .left-\\[146px\\]:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:146px}
html[dir="rtl"] .left-\\[22px\\]:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:22px}
html[dir="rtl"] .left-\\[5px\\]:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:5px}
html[dir="rtl"] .left-\\[6px\\]:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:6px}
html[dir="rtl"] .left-\\[88px\\]:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:88px}
html[dir="rtl"] .left-px:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:1px}
html[dir="rtl"] .ml-0:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0px}
html[dir="rtl"] .ml-0\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.125rem}
html[dir="rtl"] .ml-1:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.25rem}
html[dir="rtl"] .ml-1\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.375rem}
html[dir="rtl"] .ml-10:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:2.5rem}
html[dir="rtl"] .ml-11:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:2.75rem}
html[dir="rtl"] .ml-12:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:3rem}
html[dir="rtl"] .ml-14:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:3.5rem}
html[dir="rtl"] .ml-16:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:4rem}
html[dir="rtl"] .ml-2:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.5rem}
html[dir="rtl"] .ml-2\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.625rem}
html[dir="rtl"] .ml-20:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:5rem}
html[dir="rtl"] .ml-24:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:6rem}
html[dir="rtl"] .ml-28:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:7rem}
html[dir="rtl"] .ml-3:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.75rem}
html[dir="rtl"] .ml-3\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:0.875rem}
html[dir="rtl"] .ml-32:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:8rem}
html[dir="rtl"] .ml-36:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:9rem}
html[dir="rtl"] .ml-4:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:1rem}
html[dir="rtl"] .ml-40:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:10rem}
html[dir="rtl"] .ml-44:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:11rem}
html[dir="rtl"] .ml-48:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:12rem}
html[dir="rtl"] .ml-5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:1.25rem}
html[dir="rtl"] .ml-52:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:13rem}
html[dir="rtl"] .ml-56:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:14rem}
html[dir="rtl"] .ml-6:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:1.5rem}
html[dir="rtl"] .ml-60:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:15rem}
html[dir="rtl"] .ml-64:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:16rem}
html[dir="rtl"] .ml-7:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:1.75rem}
html[dir="rtl"] .ml-72:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:18rem}
html[dir="rtl"] .ml-8:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:2rem}
html[dir="rtl"] .ml-80:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:20rem}
html[dir="rtl"] .ml-9:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:2.25rem}
html[dir="rtl"] .ml-96:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:24rem}
html[dir="rtl"] .ml-auto:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:auto}
html[dir="rtl"] .ml-px:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:1px}
html[dir="rtl"] .mr-0:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0px}
html[dir="rtl"] .mr-0\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.125rem}
html[dir="rtl"] .mr-1:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.25rem}
html[dir="rtl"] .mr-1\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.375rem}
html[dir="rtl"] .mr-10:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:2.5rem}
html[dir="rtl"] .mr-11:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:2.75rem}
html[dir="rtl"] .mr-12:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:3rem}
html[dir="rtl"] .mr-14:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:3.5rem}
html[dir="rtl"] .mr-16:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:4rem}
html[dir="rtl"] .mr-2:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.5rem}
html[dir="rtl"] .mr-2\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.625rem}
html[dir="rtl"] .mr-20:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:5rem}
html[dir="rtl"] .mr-24:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:6rem}
html[dir="rtl"] .mr-28:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:7rem}
html[dir="rtl"] .mr-3:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.75rem}
html[dir="rtl"] .mr-3\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:0.875rem}
html[dir="rtl"] .mr-32:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:8rem}
html[dir="rtl"] .mr-36:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:9rem}
html[dir="rtl"] .mr-4:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:1rem}
html[dir="rtl"] .mr-40:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:10rem}
html[dir="rtl"] .mr-44:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:11rem}
html[dir="rtl"] .mr-48:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:12rem}
html[dir="rtl"] .mr-5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:1.25rem}
html[dir="rtl"] .mr-52:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:13rem}
html[dir="rtl"] .mr-56:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:14rem}
html[dir="rtl"] .mr-6:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:1.5rem}
html[dir="rtl"] .mr-60:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:15rem}
html[dir="rtl"] .mr-64:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:16rem}
html[dir="rtl"] .mr-7:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:1.75rem}
html[dir="rtl"] .mr-72:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:18rem}
html[dir="rtl"] .mr-8:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:2rem}
html[dir="rtl"] .mr-80:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:20rem}
html[dir="rtl"] .mr-9:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:2.25rem}
html[dir="rtl"] .mr-96:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:24rem}
html[dir="rtl"] .mr-auto:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:auto}
html[dir="rtl"] .mr-px:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:1px}
html[dir="rtl"] .pl-0:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0px}
html[dir="rtl"] .pl-0\\.5:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.125rem}
html[dir="rtl"] .pl-1:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.25rem}
html[dir="rtl"] .pl-1\\.5:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.375rem}
html[dir="rtl"] .pl-10:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:2.5rem}
html[dir="rtl"] .pl-11:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:2.75rem}
html[dir="rtl"] .pl-12:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:3rem}
html[dir="rtl"] .pl-14:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:3.5rem}
html[dir="rtl"] .pl-16:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:4rem}
html[dir="rtl"] .pl-2:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.5rem}
html[dir="rtl"] .pl-2\\.5:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.625rem}
html[dir="rtl"] .pl-20:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:5rem}
html[dir="rtl"] .pl-24:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:6rem}
html[dir="rtl"] .pl-28:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:7rem}
html[dir="rtl"] .pl-3:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.75rem}
html[dir="rtl"] .pl-3\\.5:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:0.875rem}
html[dir="rtl"] .pl-32:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:8rem}
html[dir="rtl"] .pl-36:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:9rem}
html[dir="rtl"] .pl-4:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:1rem}
html[dir="rtl"] .pl-40:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:10rem}
html[dir="rtl"] .pl-44:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:11rem}
html[dir="rtl"] .pl-48:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:12rem}
html[dir="rtl"] .pl-5:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:1.25rem}
html[dir="rtl"] .pl-52:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:13rem}
html[dir="rtl"] .pl-56:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:14rem}
html[dir="rtl"] .pl-6:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:1.5rem}
html[dir="rtl"] .pl-60:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:15rem}
html[dir="rtl"] .pl-64:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:16rem}
html[dir="rtl"] .pl-7:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:1.75rem}
html[dir="rtl"] .pl-72:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:18rem}
html[dir="rtl"] .pl-8:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:2rem}
html[dir="rtl"] .pl-80:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:20rem}
html[dir="rtl"] .pl-9:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:2.25rem}
html[dir="rtl"] .pl-96:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:24rem}
html[dir="rtl"] .pl-px:not([class*=" pr-"]):not([class^="pr-"]):not([class*=" -pr-"]):not([class^="-pr-"]){padding-left:0;padding-right:1px}
html[dir="rtl"] .pr-0:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0px}
html[dir="rtl"] .pr-0\\.5:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.125rem}
html[dir="rtl"] .pr-1:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.25rem}
html[dir="rtl"] .pr-1\\.5:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.375rem}
html[dir="rtl"] .pr-10:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:2.5rem}
html[dir="rtl"] .pr-11:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:2.75rem}
html[dir="rtl"] .pr-12:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:3rem}
html[dir="rtl"] .pr-14:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:3.5rem}
html[dir="rtl"] .pr-16:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:4rem}
html[dir="rtl"] .pr-2:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.5rem}
html[dir="rtl"] .pr-2\\.5:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.625rem}
html[dir="rtl"] .pr-20:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:5rem}
html[dir="rtl"] .pr-24:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:6rem}
html[dir="rtl"] .pr-28:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:7rem}
html[dir="rtl"] .pr-3:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.75rem}
html[dir="rtl"] .pr-3\\.5:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:0.875rem}
html[dir="rtl"] .pr-32:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:8rem}
html[dir="rtl"] .pr-36:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:9rem}
html[dir="rtl"] .pr-4:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:1rem}
html[dir="rtl"] .pr-40:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:10rem}
html[dir="rtl"] .pr-44:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:11rem}
html[dir="rtl"] .pr-48:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:12rem}
html[dir="rtl"] .pr-5:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:1.25rem}
html[dir="rtl"] .pr-52:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:13rem}
html[dir="rtl"] .pr-56:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:14rem}
html[dir="rtl"] .pr-6:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:1.5rem}
html[dir="rtl"] .pr-60:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:15rem}
html[dir="rtl"] .pr-64:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:16rem}
html[dir="rtl"] .pr-7:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:1.75rem}
html[dir="rtl"] .pr-72:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:18rem}
html[dir="rtl"] .pr-8:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:2rem}
html[dir="rtl"] .pr-80:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:20rem}
html[dir="rtl"] .pr-9:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:2.25rem}
html[dir="rtl"] .pr-96:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:24rem}
html[dir="rtl"] .pr-px:not([class*=" pl-"]):not([class^="pl-"]):not([class*=" -pl-"]):not([class^="-pl-"]){padding-right:0;padding-left:1px}
html[dir="rtl"] .right-0:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0px}
html[dir="rtl"] .right-0\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.125rem}
html[dir="rtl"] .right-1:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.25rem}
html[dir="rtl"] .right-1\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.375rem}
html[dir="rtl"] .right-10:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:2.5rem}
html[dir="rtl"] .right-11:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:2.75rem}
html[dir="rtl"] .right-12:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:3rem}
html[dir="rtl"] .right-14:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:3.5rem}
html[dir="rtl"] .right-16:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:4rem}
html[dir="rtl"] .right-2:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.5rem}
html[dir="rtl"] .right-2\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.625rem}
html[dir="rtl"] .right-20:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:5rem}
html[dir="rtl"] .right-24:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:6rem}
html[dir="rtl"] .right-28:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:7rem}
html[dir="rtl"] .right-3:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.75rem}
html[dir="rtl"] .right-3\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:0.875rem}
html[dir="rtl"] .right-32:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:8rem}
html[dir="rtl"] .right-36:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:9rem}
html[dir="rtl"] .right-4:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:1rem}
html[dir="rtl"] .right-40:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:10rem}
html[dir="rtl"] .right-44:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:11rem}
html[dir="rtl"] .right-48:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:12rem}
html[dir="rtl"] .right-5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:1.25rem}
html[dir="rtl"] .right-52:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:13rem}
html[dir="rtl"] .right-56:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:14rem}
html[dir="rtl"] .right-6:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:1.5rem}
html[dir="rtl"] .right-60:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:15rem}
html[dir="rtl"] .right-64:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:16rem}
html[dir="rtl"] .right-7:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:1.75rem}
html[dir="rtl"] .right-72:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:18rem}
html[dir="rtl"] .right-8:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:2rem}
html[dir="rtl"] .right-80:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:20rem}
html[dir="rtl"] .right-9:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:2.25rem}
html[dir="rtl"] .right-96:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:24rem}
html[dir="rtl"] .right-\\[3px\\]:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:3px}
html[dir="rtl"] .right-px:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:1px}
html[dir="rtl"] .-left-0\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.125rem * -1)}
html[dir="rtl"] .-left-1:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.25rem * -1)}
html[dir="rtl"] .-left-1\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.375rem * -1)}
html[dir="rtl"] .-left-10:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(2.5rem * -1)}
html[dir="rtl"] .-left-11:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(2.75rem * -1)}
html[dir="rtl"] .-left-12:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(3rem * -1)}
html[dir="rtl"] .-left-14:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(3.5rem * -1)}
html[dir="rtl"] .-left-16:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(4rem * -1)}
html[dir="rtl"] .-left-2:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.5rem * -1)}
html[dir="rtl"] .-left-2\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.625rem * -1)}
html[dir="rtl"] .-left-20:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(5rem * -1)}
html[dir="rtl"] .-left-24:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(6rem * -1)}
html[dir="rtl"] .-left-28:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(7rem * -1)}
html[dir="rtl"] .-left-3:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.75rem * -1)}
html[dir="rtl"] .-left-3\\.5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(0.875rem * -1)}
html[dir="rtl"] .-left-32:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(8rem * -1)}
html[dir="rtl"] .-left-36:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(9rem * -1)}
html[dir="rtl"] .-left-4:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(1rem * -1)}
html[dir="rtl"] .-left-40:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(10rem * -1)}
html[dir="rtl"] .-left-44:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(11rem * -1)}
html[dir="rtl"] .-left-48:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(12rem * -1)}
html[dir="rtl"] .-left-5:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(1.25rem * -1)}
html[dir="rtl"] .-left-52:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(13rem * -1)}
html[dir="rtl"] .-left-56:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(14rem * -1)}
html[dir="rtl"] .-left-6:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(1.5rem * -1)}
html[dir="rtl"] .-left-60:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(15rem * -1)}
html[dir="rtl"] .-left-64:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(16rem * -1)}
html[dir="rtl"] .-left-7:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(1.75rem * -1)}
html[dir="rtl"] .-left-72:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(18rem * -1)}
html[dir="rtl"] .-left-8:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(2rem * -1)}
html[dir="rtl"] .-left-80:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(20rem * -1)}
html[dir="rtl"] .-left-9:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(2.25rem * -1)}
html[dir="rtl"] .-left-96:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(24rem * -1)}
html[dir="rtl"] .-left-px:not([class*=" right-"]):not([class^="right-"]):not([class*=" -right-"]):not([class^="-right-"]){left:auto;right:calc(1px * -1)}
html[dir="rtl"] .-ml-0\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.125rem * -1)}
html[dir="rtl"] .-ml-1:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.25rem * -1)}
html[dir="rtl"] .-ml-1\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.375rem * -1)}
html[dir="rtl"] .-ml-10:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(2.5rem * -1)}
html[dir="rtl"] .-ml-11:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(2.75rem * -1)}
html[dir="rtl"] .-ml-12:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(3rem * -1)}
html[dir="rtl"] .-ml-14:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(3.5rem * -1)}
html[dir="rtl"] .-ml-16:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(4rem * -1)}
html[dir="rtl"] .-ml-2:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.5rem * -1)}
html[dir="rtl"] .-ml-2\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.625rem * -1)}
html[dir="rtl"] .-ml-20:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(5rem * -1)}
html[dir="rtl"] .-ml-24:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(6rem * -1)}
html[dir="rtl"] .-ml-28:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(7rem * -1)}
html[dir="rtl"] .-ml-3:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.75rem * -1)}
html[dir="rtl"] .-ml-3\\.5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(0.875rem * -1)}
html[dir="rtl"] .-ml-32:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(8rem * -1)}
html[dir="rtl"] .-ml-36:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(9rem * -1)}
html[dir="rtl"] .-ml-4:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(1rem * -1)}
html[dir="rtl"] .-ml-40:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(10rem * -1)}
html[dir="rtl"] .-ml-44:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(11rem * -1)}
html[dir="rtl"] .-ml-48:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(12rem * -1)}
html[dir="rtl"] .-ml-5:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(1.25rem * -1)}
html[dir="rtl"] .-ml-52:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(13rem * -1)}
html[dir="rtl"] .-ml-56:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(14rem * -1)}
html[dir="rtl"] .-ml-6:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(1.5rem * -1)}
html[dir="rtl"] .-ml-60:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(15rem * -1)}
html[dir="rtl"] .-ml-64:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(16rem * -1)}
html[dir="rtl"] .-ml-7:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(1.75rem * -1)}
html[dir="rtl"] .-ml-72:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(18rem * -1)}
html[dir="rtl"] .-ml-8:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(2rem * -1)}
html[dir="rtl"] .-ml-80:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(20rem * -1)}
html[dir="rtl"] .-ml-9:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(2.25rem * -1)}
html[dir="rtl"] .-ml-96:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(24rem * -1)}
html[dir="rtl"] .-ml-px:not([class*=" mr-"]):not([class^="mr-"]):not([class*=" -mr-"]):not([class^="-mr-"]){margin-left:0;margin-right:calc(1px * -1)}
html[dir="rtl"] .-mr-0\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.125rem * -1)}
html[dir="rtl"] .-mr-1:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.25rem * -1)}
html[dir="rtl"] .-mr-1\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.375rem * -1)}
html[dir="rtl"] .-mr-10:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(2.5rem * -1)}
html[dir="rtl"] .-mr-11:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(2.75rem * -1)}
html[dir="rtl"] .-mr-12:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(3rem * -1)}
html[dir="rtl"] .-mr-14:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(3.5rem * -1)}
html[dir="rtl"] .-mr-16:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(4rem * -1)}
html[dir="rtl"] .-mr-2:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.5rem * -1)}
html[dir="rtl"] .-mr-2\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.625rem * -1)}
html[dir="rtl"] .-mr-20:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(5rem * -1)}
html[dir="rtl"] .-mr-24:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(6rem * -1)}
html[dir="rtl"] .-mr-28:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(7rem * -1)}
html[dir="rtl"] .-mr-3:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.75rem * -1)}
html[dir="rtl"] .-mr-3\\.5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(0.875rem * -1)}
html[dir="rtl"] .-mr-32:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(8rem * -1)}
html[dir="rtl"] .-mr-36:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(9rem * -1)}
html[dir="rtl"] .-mr-4:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(1rem * -1)}
html[dir="rtl"] .-mr-40:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(10rem * -1)}
html[dir="rtl"] .-mr-44:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(11rem * -1)}
html[dir="rtl"] .-mr-48:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(12rem * -1)}
html[dir="rtl"] .-mr-5:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(1.25rem * -1)}
html[dir="rtl"] .-mr-52:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(13rem * -1)}
html[dir="rtl"] .-mr-56:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(14rem * -1)}
html[dir="rtl"] .-mr-6:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(1.5rem * -1)}
html[dir="rtl"] .-mr-60:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(15rem * -1)}
html[dir="rtl"] .-mr-64:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(16rem * -1)}
html[dir="rtl"] .-mr-7:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(1.75rem * -1)}
html[dir="rtl"] .-mr-72:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(18rem * -1)}
html[dir="rtl"] .-mr-8:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(2rem * -1)}
html[dir="rtl"] .-mr-80:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(20rem * -1)}
html[dir="rtl"] .-mr-9:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(2.25rem * -1)}
html[dir="rtl"] .-mr-96:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(24rem * -1)}
html[dir="rtl"] .-mr-px:not([class*=" ml-"]):not([class^="ml-"]):not([class*=" -ml-"]):not([class^="-ml-"]){margin-right:0;margin-left:calc(1px * -1)}
html[dir="rtl"] .-right-0\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.125rem * -1)}
html[dir="rtl"] .-right-1:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.25rem * -1)}
html[dir="rtl"] .-right-1\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.375rem * -1)}
html[dir="rtl"] .-right-10:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(2.5rem * -1)}
html[dir="rtl"] .-right-11:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(2.75rem * -1)}
html[dir="rtl"] .-right-12:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(3rem * -1)}
html[dir="rtl"] .-right-14:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(3.5rem * -1)}
html[dir="rtl"] .-right-16:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(4rem * -1)}
html[dir="rtl"] .-right-2:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.5rem * -1)}
html[dir="rtl"] .-right-2\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.625rem * -1)}
html[dir="rtl"] .-right-20:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(5rem * -1)}
html[dir="rtl"] .-right-24:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(6rem * -1)}
html[dir="rtl"] .-right-28:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(7rem * -1)}
html[dir="rtl"] .-right-3:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.75rem * -1)}
html[dir="rtl"] .-right-3\\.5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(0.875rem * -1)}
html[dir="rtl"] .-right-32:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(8rem * -1)}
html[dir="rtl"] .-right-36:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(9rem * -1)}
html[dir="rtl"] .-right-4:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(1rem * -1)}
html[dir="rtl"] .-right-40:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(10rem * -1)}
html[dir="rtl"] .-right-44:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(11rem * -1)}
html[dir="rtl"] .-right-48:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(12rem * -1)}
html[dir="rtl"] .-right-5:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(1.25rem * -1)}
html[dir="rtl"] .-right-52:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(13rem * -1)}
html[dir="rtl"] .-right-56:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(14rem * -1)}
html[dir="rtl"] .-right-6:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(1.5rem * -1)}
html[dir="rtl"] .-right-60:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(15rem * -1)}
html[dir="rtl"] .-right-64:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(16rem * -1)}
html[dir="rtl"] .-right-7:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(1.75rem * -1)}
html[dir="rtl"] .-right-72:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(18rem * -1)}
html[dir="rtl"] .-right-8:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(2rem * -1)}
html[dir="rtl"] .-right-80:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(20rem * -1)}
html[dir="rtl"] .-right-9:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(2.25rem * -1)}
html[dir="rtl"] .-right-96:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(24rem * -1)}
html[dir="rtl"] .-right-px:not([class*=" left-"]):not([class^="left-"]):not([class*=" -left-"]):not([class^="-left-"]){right:auto;left:calc(1px * -1)}
html[dir="rtl"] .text-left{text-align:right}
html[dir="rtl"] .text-right{text-align:left}
html[dir="rtl"] [class*="space-x-"]>:not([hidden])~:not([hidden]){--tw-space-x-reverse:1}
html[dir="rtl"] [class*="divide-x"]>:not([hidden])~:not([hidden]){--tw-divide-x-reverse:1}
html[dir="rtl"] svg[class*="lucide-arrow-left"],html[dir="rtl"] svg[class*="lucide-arrow-right"],html[dir="rtl"] svg[class*="lucide-chevron-left"],html[dir="rtl"] svg[class*="lucide-chevron-right"],html[dir="rtl"] svg[class*="lucide-chevrons-left"],html[dir="rtl"] svg[class*="lucide-chevrons-right"]{scale:-1 1}
html[dir="rtl"] .truncate,html[dir="rtl"] [class*="line-clamp-"]{unicode-bidi:plaintext}
html[dir="rtl"] .translate-x-px{--tw-translate-x:calc(1px * -1)}
html[dir="rtl"] .-translate-x-px{--tw-translate-x:1px}
html[dir="rtl"] .translate-x-0\\.5{--tw-translate-x:calc(0.125rem * -1)}
html[dir="rtl"] .-translate-x-0\\.5{--tw-translate-x:0.125rem}
html[dir="rtl"] .translate-x-1{--tw-translate-x:calc(0.25rem * -1)}
html[dir="rtl"] .-translate-x-1{--tw-translate-x:0.25rem}
html[dir="rtl"] .translate-x-1\\.5{--tw-translate-x:calc(0.375rem * -1)}
html[dir="rtl"] .-translate-x-1\\.5{--tw-translate-x:0.375rem}
html[dir="rtl"] .translate-x-2{--tw-translate-x:calc(0.5rem * -1)}
html[dir="rtl"] .-translate-x-2{--tw-translate-x:0.5rem}
html[dir="rtl"] .translate-x-2\\.5{--tw-translate-x:calc(0.625rem * -1)}
html[dir="rtl"] .-translate-x-2\\.5{--tw-translate-x:0.625rem}
html[dir="rtl"] .translate-x-3{--tw-translate-x:calc(0.75rem * -1)}
html[dir="rtl"] .-translate-x-3{--tw-translate-x:0.75rem}
html[dir="rtl"] .translate-x-3\\.5{--tw-translate-x:calc(0.875rem * -1)}
html[dir="rtl"] .-translate-x-3\\.5{--tw-translate-x:0.875rem}
html[dir="rtl"] .translate-x-4{--tw-translate-x:calc(1rem * -1)}
html[dir="rtl"] .-translate-x-4{--tw-translate-x:1rem}
html[dir="rtl"] .translate-x-5{--tw-translate-x:calc(1.25rem * -1)}
html[dir="rtl"] .-translate-x-5{--tw-translate-x:1.25rem}
html[dir="rtl"] .translate-x-6{--tw-translate-x:calc(1.5rem * -1)}
html[dir="rtl"] .-translate-x-6{--tw-translate-x:1.5rem}
html[dir="rtl"] .translate-x-7{--tw-translate-x:calc(1.75rem * -1)}
html[dir="rtl"] .-translate-x-7{--tw-translate-x:1.75rem}
html[dir="rtl"] .translate-x-8{--tw-translate-x:calc(2rem * -1)}
html[dir="rtl"] .-translate-x-8{--tw-translate-x:2rem}
html[dir="rtl"] .translate-x-9{--tw-translate-x:calc(2.25rem * -1)}
html[dir="rtl"] .-translate-x-9{--tw-translate-x:2.25rem}
html[dir="rtl"] .translate-x-10{--tw-translate-x:calc(2.5rem * -1)}
html[dir="rtl"] .-translate-x-10{--tw-translate-x:2.5rem}
html[dir="rtl"] .translate-x-11{--tw-translate-x:calc(2.75rem * -1)}
html[dir="rtl"] .-translate-x-11{--tw-translate-x:2.75rem}
html[dir="rtl"] .translate-x-12{--tw-translate-x:calc(3rem * -1)}
html[dir="rtl"] .-translate-x-12{--tw-translate-x:3rem}
html[dir="rtl"] .translate-x-14{--tw-translate-x:calc(3.5rem * -1)}
html[dir="rtl"] .-translate-x-14{--tw-translate-x:3.5rem}
html[dir="rtl"] .translate-x-16{--tw-translate-x:calc(4rem * -1)}
html[dir="rtl"] .-translate-x-16{--tw-translate-x:4rem}
html[dir="rtl"] .translate-x-20{--tw-translate-x:calc(5rem * -1)}
html[dir="rtl"] .-translate-x-20{--tw-translate-x:5rem}
html[dir="rtl"] .translate-x-24{--tw-translate-x:calc(6rem * -1)}
html[dir="rtl"] .-translate-x-24{--tw-translate-x:6rem}
html[dir="rtl"] .translate-x-28{--tw-translate-x:calc(7rem * -1)}
html[dir="rtl"] .-translate-x-28{--tw-translate-x:7rem}
html[dir="rtl"] .translate-x-32{--tw-translate-x:calc(8rem * -1)}
html[dir="rtl"] .-translate-x-32{--tw-translate-x:8rem}
html[dir="rtl"] .translate-x-36{--tw-translate-x:calc(9rem * -1)}
html[dir="rtl"] .-translate-x-36{--tw-translate-x:9rem}
html[dir="rtl"] .translate-x-40{--tw-translate-x:calc(10rem * -1)}
html[dir="rtl"] .-translate-x-40{--tw-translate-x:10rem}
html[dir="rtl"] .translate-x-44{--tw-translate-x:calc(11rem * -1)}
html[dir="rtl"] .-translate-x-44{--tw-translate-x:11rem}
html[dir="rtl"] .translate-x-48{--tw-translate-x:calc(12rem * -1)}
html[dir="rtl"] .-translate-x-48{--tw-translate-x:12rem}
html[dir="rtl"] .translate-x-52{--tw-translate-x:calc(13rem * -1)}
html[dir="rtl"] .-translate-x-52{--tw-translate-x:13rem}
html[dir="rtl"] .translate-x-56{--tw-translate-x:calc(14rem * -1)}
html[dir="rtl"] .-translate-x-56{--tw-translate-x:14rem}
html[dir="rtl"] .translate-x-60{--tw-translate-x:calc(15rem * -1)}
html[dir="rtl"] .-translate-x-60{--tw-translate-x:15rem}
html[dir="rtl"] .translate-x-64{--tw-translate-x:calc(16rem * -1)}
html[dir="rtl"] .-translate-x-64{--tw-translate-x:16rem}
html[dir="rtl"] .translate-x-72{--tw-translate-x:calc(18rem * -1)}
html[dir="rtl"] .-translate-x-72{--tw-translate-x:18rem}
html[dir="rtl"] .translate-x-80{--tw-translate-x:calc(20rem * -1)}
html[dir="rtl"] .-translate-x-80{--tw-translate-x:20rem}
html[dir="rtl"] .translate-x-96{--tw-translate-x:calc(24rem * -1)}
html[dir="rtl"] .-translate-x-96{--tw-translate-x:24rem}
`;

export function applyRtlStyles(on: boolean) {
  if (typeof document === 'undefined') return;
  const id = 'cylen-rtl-styles';
  const old = document.getElementById(id);
  if (!on) { old?.remove(); return; }
  if (old) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = RTL_CSS;
  document.head.appendChild(el);
}
