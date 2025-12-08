```mermaid
flowchart LR
    subgraph Data
        DT[Types (src/types)]
        DS[Services (src/services)]
        DA[API Clients (src/lib, src/data)]
    end

    subgraph Views
        subgraph ViewLayers
            VP[Pages (src/app)]
            VL[Layouts (src/app/**/layout.tsx)]
            VC[Components (src/components)]
        end
        VH[Hooks (src/hooks)]
        VU[Utils (src/utils, src/lib/helpers)]
        VR[State Store (src/store, src/stores)]
    end

    subgraph Assets
        VI[Icons (src/components/icons, public/icons)]
        IM[Images (public/images, src/app/**/images)]
    end

    DT --> DS --> DA
    DA --> VP
    DA --> VC
    VP --> VL
    VL --> VC
    VC --> VH
    VH --> VR
    VR --> VP
    VC --> VU
    VP --> VI
    VP --> IM
    VC --> IM
```
