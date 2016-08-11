# euporias-video-stream-sampler
euporias - ceramic bell project - video stream sampler

##installation
`npm i -g gulp`  
`npm install`

##running
`gulp serve`

##usage
Drag and drop a box over the section of video stream you wish to sample.  
After each frame, global `sample` object contains `diff` property: An array (in same order as cells) specifying the sum of all pixels in that cell differenced against the previous frame. Negative value indicates cell pixels have become darker, Positive value indicates cell pixels have become lighter.
