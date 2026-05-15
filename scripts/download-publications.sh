#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../public/assets/publications"
# Run this locally if you want to vendor public PDFs inside the repository.
# After downloading, change the relevant `pdf` fields in src/data/publications.json to /assets/publications/<filename>.pdf.
curl -L -o csp-moments-2025.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/Paper_Continuous_Scatterplot_and_Image_Moments_for_Time_Varying_Bivariate_Field_Analysis.pdf'
curl -L -o csp-moments-2025-supplement.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/Supp_Material_Continuous_Scatterplot_and_Image_Moments_for_Time_Varying_Bivariate_Field_Analysis.pdf'
curl -L -o csp-operators-2024.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/CSPOperators_Mohit.pdf'
curl -L -o csp-operators-2024-supplement.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/supplementary_CSPOperators_Mohit.pdf'
curl -L -o jacobi-simplification-2024.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/Jacobi_Set_Simplification_for_Tracking_TOPO_FeaturesinTVSF.pdf'
curl -L -o jacobi-simplification-2024-supplement.pdf 'https://vgl.csa.iisc.ac.in/pdf/pub/JS_Simplification_Supplementary.pdf'
curl -L -o segmentation-peeling-2021.pdf 'https://www.diva-portal.se/smash/get/diva2%3A1626723/FULLTEXT02.pdf'
curl -L -o volume-fusion-2025.pdf 'https://arxiv.org/pdf/2508.14719'
