"""Read-only painting registration; emit SVG masks/landmark transforms into JSON."""
import argparse, json, math, hashlib
from pathlib import Path
from PIL import Image
import numpy as np
parser=argparse.ArgumentParser();parser.add_argument('characters',nargs='*',default=['star-moon','scholar','quqi','star-cap']);args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
specs={
 'star-moon':{'eyes':[[[.47,.26],[.575,.258]],[[.461,.253],[.563,.253]],[[.478,.249],[.573,.242]]],'face':[.53,.28,.112,.119],'free':[[.14,.405],[.265,.40],[.31,.58],[.345,.73],[.56,.92],[.58,1],[.09,1],[.07,.78],[.13,.59]],'pivot':[.25,.45], 'grip':[[.76,.43],[.93,.45],[1,.69],[1,1],[.80,1],[.74,.80],[.75,.63]], 'shaft':[[.80,.055],[.995,.055],[.85,1],[.73,1]],'gripPivot':[.76,.455]},
 'scholar':{'eyes':[[[.491,.235],[.582,.235]],[[.434,.233],[.528,.233]],[[.416,.228],[.510,.228]]],'face':[.53,.265,.106,.12],'free':[[.16,.39],[.29,.405],[.31,.61],[.33,.78],[.45,.94],[.46,1],[.06,1],[.06,.72],[.13,.52]],'pivot':[.23,.43], 'grip':[[.73,.43],[.89,.44],[.99,.71],[1,1],[.76,1],[.71,.80],[.73,.63]],'shaft':[[.72,.075],[.94,.075],[.81,1],[.68,1]],'gripPivot':[.74,.45]},
 'quqi':{'eyes':[[[.487,.252],[.612,.253]],[[.412,.25],[.563,.251]],[[.434,.232],[.566,.233]]],'face':[.515,.28,.15,.123],'free':[[.23,.395],[.32,.415],[.34,.61],[.37,.80],[.46,.94],[.46,1],[.08,1],[.10,.72],[.19,.51]],'pivot':[.28,.43], 'grip':[[.73,.425],[.86,.45],[1,.69],[1,1],[.75,1],[.70,.82],[.73,.64]],'shaft':[[.715,.13],[.90,.13],[.80,1],[.67,1]],'gripPivot':[.72,.44]},
 'star-cap':{'eyes':[[[.447,.302],[.56,.301]],[[.411,.29],[.531,.292]],[[.424,.274],[.541,.274]]],'face':[.514,.32,.15,.117],'free':[[.215,.44],[.32,.46],[.34,.63],[.33,.80],[.40,.95],[.42,1],[.06,1],[.08,.76],[.19,.55]],'pivot':[.26,.475], 'grip':[[.74,.45],[.88,.47],[.99,.73],[1,1],[.75,1],[.70,.82],[.73,.65]],'shaft':[[.775,.12],[.97,.12],[.79,1],[.66,1]],'gripPivot':[.735,.46]},
}
mouths={
 'star-moon':{'target':[.538,.302],'source':[[.530,.331],[.519,.333],[.532,.324]]},
 'scholar':{'target':[.529,.282],'source':[[.532,.310],[.478,.313],[.460,.305]]},
 'quqi':{'target':[.515,.290],'source':[[.549,.337],[.485,.335],[.499,.313]]},
 'star-cap':{'target':[.510,.335],'source':[[.504,.378],[.461,.385],[.490,.369]]},
}
for role in args.characters:
 p=root/'public/characters'/role;image_path=p/'staff-acting-v1.png';image=Image.open(image_path).convert('RGBA');W,H=image.size;cell=W/3
 manifest_path=p/'manifest.json';manifest=json.loads(manifest_path.read_text(encoding='utf-8-sig'));asset=manifest['staff'];spec=specs[role]
 def center(guess,column):
  sx=(guess[0]+column)*cell;sy=guess[1]*H;rx=max(6,round(cell*.018));ry=max(4,round(H*.014));points=[]
  for y in range(round(sy)-ry,round(sy)+ry+1):
   for x in range(round(sx)-rx,round(sx)+rx+1):
    r,g,b,a=image.getpixel((x,y));weight=max(0,110-(.2126*r+.7152*g+.0722*b))*math.exp(-((x-sx)/rx)**2*2-((y-sy)/ry)**2*2) if a>220 else 0
    points.append((x,y,weight))
  total=sum(point[2] for point in points)
  if total<1:return guess
  return [sum(point[0]*point[2] for point in points)/total/cell-column,sum(point[1]*point[2] for point in points)/total/H]
 registrations={};detected={}
 target=[eye['open'] for eye in asset['eyes']]+[mouths[role]['target']];bx,by,bw,bh=asset['bounds']
 for column,pose in enumerate(['focus','active','smile']):
  source=[center(guess,column) for guess in spec['eyes'][column]]+[mouths[role]['source'][column]];detected[pose]=source
  s=[[bx+x*bw,by+y*bh] for x,y in source];t=[[bx+x*bw,by+y*bh] for x,y in target]
  coefficients=np.linalg.solve(np.array([[point[0],point[1],1] for point in s]),np.array(t))
  registrations[pose]=[round(float(coefficients[row,column]),6) for row,column in [(0,0),(0,1),(1,0),(1,1),(2,0),(2,1)]]
 asset['acting']={'atlas':f'/characters/{role}/staff-acting-v1.png','grid':[3,1],'parts':{pose:[i,0,0,0,1,1] for i,pose in enumerate(['focus','active','smile'])},'registration':registrations,'face':spec['face'],'freeArm':spec['free'],'freePivot':spec['pivot'],'gripRegions':[spec['grip'],spec['shaft']],'gripPivot':spec['gripPivot']}
 manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'role':role,'size':image.size,'landmarks':detected,'sha256':hashlib.sha256(image_path.read_bytes()).hexdigest()}))
