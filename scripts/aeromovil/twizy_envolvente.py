import numpy as np, json, struct, sys
d = open(sys.argv[1],'rb').read()
n = struct.unpack('<I', d[4:8])[0]; meta = json.loads(d[8:8+n]); off = 8+n
T=[]; M=[]
for p in meta['partes']:
    v = np.frombuffer(d, np.int16, p['v']*3, off).reshape(-1,3)*1e-4; off += p['v']*6; off += (-off)%4
    i = np.frombuffer(d, np.uint16, p['i'], off).reshape(-1,3); off += p['i']*2; off += (-off)%4
    T.append(v[i]); M += [p['m']]*len(i)
T = np.vstack(T); M = np.array(M)
cuerpo = ~np.isin(M, ['guardabarros','muelle','acero','negro'])
T = T[cuerpo]
# fuera retrovisores: triángulos con |z|>0.5 y y>0.7
T = T[~((np.abs(T[:,:,2]).max(1)>0.5)&(T[:,:,1].min(1)>0.65))]
def raster(T, a, b, lo, hi, h):
    na, nb = int((hi[0]-lo[0])/h)+1, int((hi[1]-lo[1])/h)+1
    G = np.zeros((na, nb), bool)
    A = np.arange(na)*h+lo[0]+h/2; B = np.arange(nb)*h+lo[1]+h/2
    for t in T:
        P = t[:, [a, b]]; mn = P.min(0); mx = P.max(0)
        i0, i1 = max(0,int((mn[0]-lo[0])/h)), min(na, int((mx[0]-lo[0])/h)+2)
        j0, j1 = max(0,int((mn[1]-lo[1])/h)), min(nb, int((mx[1]-lo[1])/h)+2)
        if i1<=i0 or j1<=j0: continue
        X, Y = np.meshgrid(A[i0:i1], B[j0:j1], indexing='ij')
        q = np.stack([X.ravel(), Y.ravel()],1)
        p0,p1,p2 = P; v0 = p2-p0; v1 = p1-p0; v2 = q-p0
        den = v0[0]*v1[1]-v1[0]*v0[1]
        if abs(den)<1e-14: continue
        u = (v2[:,0]*v1[1]-v1[0]*v2[:,1])/den; w = (v0[0]*v2[:,1]-v2[:,0]*v0[1])/den
        G[i0:i1, j0:j1] |= ((u>=-1e-9)&(w>=-1e-9)&(u+w<=1+1e-9)).reshape(X.shape)
    return G, A, B
h = 0.01
Gs, Ax, Ay = raster(T, 0, 1, (-2.05, 0.0), (0.35, 1.5), h)   # lado
Gp, _, Az = raster(T, 0, 2, (-2.05, -0.75), (0.35, 0.75), h)  # planta
env = []
for x in np.arange(0.30, -2.03, -0.05):
    i = int(round((x+2.05)/h - 0.5))
    col = np.where(Gs[i])[0]; row = np.where(Gp[i])[0]
    if not len(col) or not len(row): continue
    env.append([round(float(x),2), round(float(Ay[col.min()]-h/2),3), round(float(Ay[col.max()]+h/2),3), round(float(np.abs(Az[row]).max()+h/2),3)])
print(json.dumps(env))
