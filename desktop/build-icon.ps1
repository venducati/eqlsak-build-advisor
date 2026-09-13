$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'assets') | Out-Null
$images=@()
foreach($size in @(16,32,48,64,128,256)) {
  $bmp=New-Object System.Drawing.Bitmap($size,$size)
  $g=[System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.Clear([System.Drawing.Color]::FromArgb(25,21,16))
  $gold=New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(221,188,111),[single]($size/28))
  $g.DrawEllipse($gold,[single]($size*.13),[single]($size*.13),[single]($size*.74),[single]($size*.74))
  $needle=@([System.Drawing.PointF]::new($size*.5,$size*.17),[System.Drawing.PointF]::new($size*.67,$size*.66),[System.Drawing.PointF]::new($size*.5,$size*.57),[System.Drawing.PointF]::new($size*.33,$size*.66))
  $brush=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235,212,153))
  $g.FillPolygon($brush,$needle)
  $g.DrawLine($gold,[single]($size*.5),[single]($size*.66),[single]($size*.5),[single]($size*.81))
  $stream=New-Object System.IO.MemoryStream
  $bmp.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
  $images+=,@{Size=$size;Bytes=$stream.ToArray()}
  $stream.Dispose();$brush.Dispose();$gold.Dispose();$g.Dispose();$bmp.Dispose()
}
$iconPath=Join-Path $PSScriptRoot 'assets\advisor.ico'
$out=[System.IO.File]::Create($iconPath)
$writer=New-Object System.IO.BinaryWriter($out)
try {
 $writer.Write([uint16]0);$writer.Write([uint16]1);$writer.Write([uint16]$images.Count)
 $offset=6+16*$images.Count
 foreach($img in $images) {
  $dimension=if($img.Size -eq 256){0}else{$img.Size}
  $writer.Write([byte]$dimension);$writer.Write([byte]$dimension);$writer.Write([byte]0);$writer.Write([byte]0)
  $writer.Write([uint16]1);$writer.Write([uint16]32);$writer.Write([uint32]$img.Bytes.Length);$writer.Write([uint32]$offset)
  $offset+=$img.Bytes.Length
 }
 foreach($img in $images){$writer.Write([byte[]]$img.Bytes)}
} finally {$writer.Dispose();$out.Dispose()}
'Created original compass application icon.'
