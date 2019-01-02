FROM openjdk:8u181 AS build

# Env variables
ENV SCALA_VERSION 2.11.12
ENV SBT_VERSION 1.2.8

# Install Scala
## Piping curl directly in tar
RUN \
curl -fsL https://downloads.typesafe.com/scala/$SCALA_VERSION/scala-$SCALA_VERSION.tgz | tar xfz - -C /root/ && \
echo >> /root/.bashrc && \
echo "export PATH=~/scala-$SCALA_VERSION/bin:$PATH" >> /root/.bashrc

# Install sbt
RUN \
curl -L -o sbt-$SBT_VERSION.deb https://dl.bintray.com/sbt/debian/sbt-$SBT_VERSION.deb && \
dpkg -i sbt-$SBT_VERSION.deb && \
rm sbt-$SBT_VERSION.deb && \
apt-get update && \
apt-get install sbt && \
sbt sbtVersion && \
mkdir project && \
echo "scalaVersion := \"${SCALA_VERSION}\"" > build.sbt && \
echo "sbt.version=${SBT_VERSION}" > project/build.properties && \
echo "case object Temp" > Temp.scala && \
sbt compile && \
rm -r project && rm build.sbt && rm Temp.scala && rm -r target

# Define working directory
WORKDIR /opt/input

# Project Definition layers change less often than application code
COPY build.sbt ./

WORKDIR /opt/input/project
# COPY project/*.scala ./
COPY project/build.properties ./
COPY project/*.sbt ./

WORKDIR /opt/input
RUN sbt reload

# Copy rest of application
COPY . ./
RUN sbt clean assembly

FROM openjdk:8u181 AS spark

RUN \
    mkdir -p /spark/ && \
    curl -fsL http://mirrors.standaloneinstaller.com/apache/spark/spark-2.4.3/spark-2.4.3-bin-hadoop2.7.tgz | tar xfz - -C /spark/

FROM openjdk:8-alpine AS final

ARG spark_home=/spark/spark-2.4.3-bin-hadoop2.7

# Before building the docker image, first build and make a Spark distribution following
# the instructions in http://spark.apache.org/docs/latest/building-spark.html.
# If this docker file is being used in the context of building your images from a Spark
# distribution, the docker build command should be invoked from the top level directory
# of the Spark distribution. E.g.:
# docker build -t spark:latest -f kubernetes/dockerfiles/spark/Dockerfile .

RUN set -ex && \
    apk upgrade --no-cache && \
    apk add --no-cache bash tini libc6-compat linux-pam nss && \
    mkdir -p /opt/spark/bin && \
    mkdir -p /opt/spark/work-dir && \
    touch /opt/spark/RELEASE && \
    rm /bin/sh && \
    ln -sv /bin/bash /bin/sh && \
    echo "auth required pam_wheel.so use_uid" >> /etc/pam.d/su && \
    chgrp root /etc/passwd && chmod ug+rw /etc/passwd

COPY --from=spark ${spark_home}/jars /opt/spark/jars
COPY --from=spark ${spark_home}/bin /opt/spark/bin
COPY --from=spark ${spark_home}/kubernetes/dockerfiles/spark/entrypoint.sh /opt/

COPY --from=build /opt/input/target/scala-2.11/spark-on-eks-assembly-v1.jar  /opt/spark/jars

ENV SPARK_HOME /opt/spark

WORKDIR /opt/spark/work-dir

ENTRYPOINT [ "/opt/entrypoint.sh" ]
