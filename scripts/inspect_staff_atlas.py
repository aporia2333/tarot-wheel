"""Register existing transparent staff paintings. Reads PNGs; writes JSON only."""
import json, hashlib, math
from pathlib import Path
from PIL import Image
from collections import deque

root = Path(__file__).resolve().parents[1]
specs = {
 'star-moon': {'eye': [(0.485,.23),(.574,.23)], 'closed':[(.485,.235),(.574,.235)], 'tip': [.889,.165], 'palette':['#d7dfda','#d7bc84'], 'hand':[.30,.86,.55,.995], 'shaft':[[.780,.8],[.824,.8],[.791,1],[.755,1]]},
 'scholar': {'eye':[(.486,.208),(.570,.208)],'closed':[(.486,.217),(.570,.217)],'tip':[.835,.214], 'palette':['#d5d9c1','#cbb17b'],'hand':[.18,.87,.44,.995],'shaft':[[.742,.8],[.786,.8],[.756,1],[.709,1]]},
 'quqi': {'eye':[(.463,.218),(.572,.218)],'closed':[(.463,.228),(.572,.228)],'tip':[.777,.234], 'palette':['#d8c99e','#dfb76f'],'hand':[.27,.86,.46,.995],'shaft':[[.715,.8],[.76,.8],[.733,1],[.688,1]]},
 'star-cap': {'eye':[(.453,.263),(.570,.263)],'closed':[(.453,.281),(.570,.281)],'tip':[.852,.244], 'palette':['#c5dce5','#d1b87e'],'hand':[.17,.85,.38,.995],'shaft':[[.715,.8],[.775,.8],[.728,1],[.687,1]]},
}
for role,spec in specs.items():
 directory=root/'public/characters'/role; file=directory/'staff-v1.png'
 image=Image.open(file).convert('RGBA'); W,H=image.size; half=W/2
 def center(guess,column):
  sx=(guess[0]+column)*half; sy=guess[1]*H; radius=max(4,round(half*.012)); weights=[]
  for yy in range(round(sy)-radius,round(sy)+radius+1):
   for xx in range(round(sx)-radius,round(sx)+radius+1):
    r,g,b,a=image.getpixel((xx,yy)); lum=.2126*r+.7152*g+.0722*b
    weight=max(0,110-lum)*math.exp(-((xx-sx)**2+(yy-sy)**2)/(radius*radius*.5)) if a>220 else 0
    weights.append((xx,yy,weight))
  total=sum(p[2] for p in weights)
  if total<1: return guess
  return [round(sum(p[0]*p[2] for p in weights)/total/half-column,6),round(sum(p[1]*p[2] for p in weights)/total/H,6)]
 eyes=[{'open':center(spec['eye'][side],0),'closed':center(spec['closed'][side],1),'radius':[.028,.020]} for side in [0,1]]
 # Read the existing painted skin/fur silhouette into a vector mask. The PNG
 # itself remains unchanged. This keeps the coat behind the tabletop.
 x0,y0,x1,y1=spec['hand']; points=set()
 for py in range(round(y0*H),round(y1*H),2):
  for px in range(round(x0*half),round(x1*half),2):
   r,g,b,a=image.getpixel((px,py))
   flesh = r>75 and r>g*.94 and b>g*.85 if role=='star-cap' else r>100 and r>g*1.03 and g>b*.75
   if flesh and a>170: points.add((px,py))
 components=[]
 while points:
  seed=points.pop(); queue=deque([seed]); component={seed}
  while queue:
   px,py=queue.popleft()
   for n in [(px-2,py),(px+2,py),(px,py-2),(px,py+2)]:
    if n in points: points.remove(n);component.add(n);queue.append(n)
  components.append(component)
 hand=max(components,key=len); rows={}
 for px,py in hand: rows.setdefault(py,[]).append(px)
 left=[[max(0,min(rows[py])-2)/half,max(0,py-1)/H] for py in sorted(rows)]
 right=[[min(half,max(rows[py])+3)/half,min(H,py+2)/H] for py in sorted(rows,reverse=True)]
 contour=[[round(px,6),round(py,6)] for px,py in left+right]
 x=round(500-sum(eye['open'][0] for eye in eyes)/2*430,2)
 asset={'atlas':f'/characters/{role}/staff-v1.png','grid':[2,1],'bounds':[x,0,430,465], 'parts':{'normal':[0,0,0,0,1,1],'closed':[1,0,0,0,1,1]}, 'tip':spec['tip'],'eyes':eyes,'foreground':[contour,spec['shaft']], 'palette':spec['palette']}
 manifest_file=directory/'manifest.json'; manifest=json.loads(manifest_file.read_text(encoding='utf-8-sig')); manifest['staff']=asset
 manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'id':role,'size':image.size,'eyes':eyes,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}))
