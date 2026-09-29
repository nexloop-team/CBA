# Reels

Drop vertical videos here, then list them in `content/reels.ts`.

```
public/reels/gaikwad-walkthrough.mp4    the video (9:16, H.264/AAC)
public/reels/gaikwad-walkthrough.webm   optional, used first if present
public/reels/gaikwad-walkthrough.jpg    optional poster frame
```

Keep each clip under roughly 8 MB so it starts quickly. Nothing is downloaded
until the reels section is near the viewport, and only clips actually on screen
play — but the file size is still what a visitor waits for once they get there.

The section hides itself entirely while `content/reels.ts` is empty.
