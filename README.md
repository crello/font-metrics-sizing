# font-metrics-sizing

## Problem

Some fonts may be displayed differently by different OS. Unix-like OS's use `hhea` metrics table but Windows use `OS/2` table instead to display font. So if tables contain different vertical metrics values then Unix-like and Windows systems will render this font not the same way.

## Solution

This tool was created to fix this issue for TrueType and OpenType fonts. The solution is to recalculate some vertical metrics values for `hhea` and `OS/2` tables.

We have three sets of formula for three cases:
- when `os2TypoLineGap = 0` and  `(os2TypoAsc + |os2TypoDesc|) > UPM`
```
    os2TypoAsc = os2TypoAsc + upperLowerAddUnits;
    os2TypoDesc = os2TypoDesc - upperLowerAddUnits;
    hheaAsc = hheaAsc + upperLowerAddUnits;
    hheaDesc = hheaDesc - upperLowerAddUnits;
    os2WinAsc = hheaAsc;
    os2WinDesc = -hheaDesc;
```
- when `os2TypoLineGap = 0` and  `(os2TypoAsc + |os2TypoDesc|) = UPM`
```
    hheaAsc = hheaAsc + upperLowerAddUnits;
    hheaDesc = hheaDesc - upperLowerAddUnits;
    os2WinAsc = hheaAsc;
    os2WinDesc = -hheaDesc;
```
- otherwise
```
    os2TypoLineGap = lineSpacingUnits;
    hheaAsc = Math.round(os2TypoAsc + (os2TypoLineGap / 2));
    hheaDesc = -1 * (totalHeight - hheaAsc);
    os2WinAsc = hheaAsc;
    os2WinDesc = -hheaDesc;
```

As you can see we used some parameters that you can't find in font tables such as: `upperLowerAddUnits`, `lineSpacingUnits`, `totalHeight`.
How we get it:
```
    hheaAscDescDelta = hheaAsc + Math.abs(hheaDesc)
    lineSpacingUnits = Math.round(factor * UPM);
    totalHeight = lineSpacingUnits + UPM;

    deltaHeight = totalHeight - hheaAscDescDelta;
    upperLowerAddUnits = Math.round(deltaHeight / 2);

```
`factor` is the second parameter for module function

## Usage

- add module to your package.json dependencies
```
{
    "dependencies": {
        ...
        
        "font-metrics-sizing": "git+https://github.com/crello/font-metrics-sizing.git",
       
        ...
    }
}
```

- install it
```
    $ npm install
```

- use module in your code
```
    const fontMetricsSizing = require('font-metrics-sizing');
    const fs = require('fs');
    
    const linespaceFactor = 10; // percent of scaling font height, default is 20
    
    const fileBuffer = fs.readFileSync('./path/to/font.ttf');
    const newFileBuffer = await fontMetricsSizing(fileBuffer, linespaceFactor);
```